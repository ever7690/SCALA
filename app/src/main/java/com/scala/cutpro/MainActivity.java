package com.scala.cutpro;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.net.URLEncoder;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final String PREFS = "scala_cut_pro";
    private static final String DEFAULT_HOST = "192.168.1.40";

    private WebView webView;
    private LinearLayout setupPanel;
    private EditText hostInput;
    private EditText codeInput;
    private TextView stateText;
    private ValueCallback<Uri[]> fileCallback;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        buildUi();
        configureWebView();
        hostInput.setText(prefs.getString("host", DEFAULT_HOST));
        String code = prefs.getString("code", "");
        codeInput.setText(code);
        if (!code.isEmpty()) connect();
    }

    private TextView text(String value, int sp, int color) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(sp);
        t.setTextColor(color);
        return t;
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(11, 12, 16));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(14), dp(10), dp(10), dp(10));
        bar.setBackgroundColor(Color.rgb(16, 19, 26));

        TextView title = text("SCALA CUT PRO", 19, Color.WHITE);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        bar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button settings = new Button(this);
        settings.setText("AJUSTES");
        settings.setOnClickListener(v -> setupPanel.setVisibility(setupPanel.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        bar.addView(settings);
        root.addView(bar);

        setupPanel = new LinearLayout(this);
        setupPanel.setOrientation(LinearLayout.VERTICAL);
        setupPanel.setPadding(dp(14), dp(10), dp(14), dp(12));
        setupPanel.setBackgroundColor(Color.rgb(21, 24, 33));
        setupPanel.addView(text("Conexión con MASTER", 16, Color.WHITE));

        TextView hint = text("El celular controla. MASTER procesa voz, subtítulos, vídeo y SCALA-AI.", 12, Color.rgb(170, 180, 195));
        hint.setPadding(0, dp(3), 0, dp(8));
        setupPanel.addView(hint);

        hostInput = new EditText(this);
        hostInput.setSingleLine(true);
        hostInput.setHint("IP de MASTER: 192.168.1.40");
        hostInput.setTextColor(Color.WHITE);
        hostInput.setHintTextColor(Color.GRAY);
        setupPanel.addView(hostInput, full());

        codeInput = new EditText(this);
        codeInput.setSingleLine(true);
        codeInput.setHint("Código de 6 dígitos");
        codeInput.setTextColor(Color.WHITE);
        codeInput.setHintTextColor(Color.GRAY);
        codeInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        setupPanel.addView(codeInput, full());

        Button connect = new Button(this);
        connect.setText("CONECTAR CON SCALA CUT PRO");
        connect.setOnClickListener(v -> connect());
        setupPanel.addView(connect, full());

        stateText = text("Esperando conexión", 12, Color.rgb(147, 197, 253));
        stateText.setPadding(0, dp(6), 0, 0);
        setupPanel.addView(stateText);
        root.addView(setupPanel);

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
    }

    private LinearLayout.LayoutParams full() {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        p.topMargin = dp(6);
        return p;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        webView.setBackgroundColor(Color.rgb(11, 12, 16));

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                stateText.setText("CONECTADO · " + hostInput.getText().toString().trim());
                setupPanel.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    setupPanel.setVisibility(View.VISIBLE);
                    stateText.setText("NO CONECTADO · revise MASTER, Wi-Fi y código");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(i, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "No se pudo abrir archivos", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimeType);
                req.addRequestHeader("User-Agent", userAgent);
                String name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                req.setTitle(name);
                req.setDescription("SCALA CUT PRO");
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(req);
                Toast.makeText(this, "Descargando: " + name, Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Toast.makeText(this, "No se pudo descargar el archivo", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void connect() {
        String host = hostInput.getText().toString().trim()
                .replace("http://", "").replace("https://", "");
        while (host.endsWith("/")) host = host.substring(0, host.length() - 1);
        if (host.contains(":")) host = host.split(":")[0];
        if (host.isEmpty()) host = DEFAULT_HOST;
        String code = codeInput.getText().toString().trim();

        if (code.length() != 6) {
            Toast.makeText(this, "Ingrese el código de 6 dígitos mostrado en MASTER", Toast.LENGTH_LONG).show();
            setupPanel.setVisibility(View.VISIBLE);
            return;
        }

        prefs.edit().putString("host", host).putString("code", code).apply();
        hostInput.setText(host);
        stateText.setText("Conectando…");
        try {
            String enc = URLEncoder.encode(code, "UTF-8");
            webView.loadUrl("http://" + host + ":8765/?token=" + enc);
        } catch (Exception e) {
            stateText.setText("Código inválido");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
