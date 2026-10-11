package com.scala.businessai;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int CREATE_BACKUP = 81;
    private static final int OPEN_BACKUP = 82;
    private WebView web;
    private String pendingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7,21,43));
        getWindow().setNavigationBarColor(Color.rgb(7,21,43));
        getWindow().getDecorView().setSystemUiVisibility(0);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(245,247,251));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setDefaultTextEncodingName("UTF-8");
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new NativeBridge(), "SCALA_NATIVE");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return true; }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView v, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("SCALA Business AI")
                    .setMessage(message).setPositiveButton("Continuar", (d,w)->result.confirm())
                    .setNegativeButton("Cancelar", (d,w)->result.cancel()).setCancelable(false).show();
                return true;
            }
        });
        setContentView(web);
        if (Build.VERSION.SDK_INT >= 35) {
            web.setOnApplyWindowInsetsListener((v,insets)->{
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());
                v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
                return insets;
            });
        }
        try {
            String html = asset("index.html");
            String css = asset("styles.css");
            String core = asset("core.js");
            String app = asset("app.js");
            String logo = "";
            try (InputStream in = getAssets().open("logo.png")) {
                ByteArrayOutputStream os = new ByteArrayOutputStream();
                byte[] chunk=new byte[8192];int n;
                while ((n=in.read(chunk))!=-1) os.write(chunk,0,n);
                logo="data:image/png;base64,"+Base64.getEncoder().encodeToString(os.toByteArray());
            } catch (Exception ignored) { }
            // Local first-party scripts only: no external network or remote code.
            html = html.replace("<link rel=\"stylesheet\" href=\"styles.css\">", "<style>"+css+"</style>")
                .replace("<script src=\"core.js\"></script>", "<script>"+core+"</script>")
                .replace("<script src=\"app.js\"></script>", "<script>"+app+"</script>")
                .replace("__LOGO_DATA__", logo);
            web.loadDataWithBaseURL("https://scala.local/", html, "text/html", "UTF-8", null);
        } catch (Exception ex) { Toast.makeText(this,"No se pudo iniciar SCALA: "+ex.getMessage(),Toast.LENGTH_LONG).show(); }
    }
    private String asset(String name) throws Exception {
        try (InputStream in=getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);
            return out.toString("UTF-8");
        }
    }
    private void toast(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
    public class NativeBridge {
        @JavascriptInterface public void shareText(String text) {
            runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(i,"Compartir desde SCALA"));});
        }
        @JavascriptInterface public void openExternal(String url){
            try {Uri uri=Uri.parse(url);if(!"https".equals(uri.getScheme())||!"wa.me".equals(uri.getHost()))return;
                runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){toast("No se encontró una aplicación para abrir el enlace.");}});
            }catch(Exception ignored){}
        }
        @JavascriptInterface public void exportBackup(String json){
            if(json.length()>5_000_000){toast("Respaldo demasiado grande");return;}
            runOnUiThread(()->{pendingExport=json;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"SCALA-Business-AI-respaldo.json");startActivityForResult(i,CREATE_BACKUP);});
        }
        @JavascriptInterface public void pickBackup(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");startActivityForResult(i,OPEN_BACKUP);});}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        Uri uri=data.getData();
        try {
            if(request==CREATE_BACKUP && pendingExport!=null){try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){
                if(out==null)throw new Exception("No se puede escribir");out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}
                pendingExport=null;toast("Copia de seguridad guardada");
            }else if(request==OPEN_BACKUP){try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
                if(in==null)throw new Exception("No se puede leer");byte[] chunk=new byte[8192];int size=0,n;
                while((n=in.read(chunk))!=-1){size+=n;if(size>5_000_000)throw new Exception("Respaldo demasiado grande");out.write(chunk,0,n);}
                String json=out.toString("UTF-8");web.evaluateJavascript("window.SCALA.importBackup("+JSONObject.quote(json)+")",null);
            }}
        }catch(Exception ex){toast("Error en respaldo: "+ex.getMessage());}
    }
    @Override public void onBackPressed(){web.evaluateJavascript("document.getElementById('overlay').hidden ? 'back' : (document.getElementById('modalClose').click(), 'dialog')", value -> { if ("\"back\"".equals(value)) MainActivity.super.onBackPressed(); });}
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("SCALA_NATIVE");web.destroy();}super.onDestroy();}
}
