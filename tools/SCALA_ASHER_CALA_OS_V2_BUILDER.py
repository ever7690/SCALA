#!/usr/bin/env python3
"""ASHER CALA OS v2 — conservative, reproducible offline MiniOS customizer.

Preserves every source-ISO byte except the *verified* existing install.esd extent.
Does not modify the source. Requires Python3, Pillow, wimlib-imagex, xorriso.
The generated ISO is a candidate until booted and installed on actual hardware.
"""
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import textwrap
from PIL import Image, ImageOps

ORIGINAL_SHA = "798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"
ORIGINAL_SIZE = 3959740416
INSTALL_LBA = 303091
SECTOR = 2048
INSTALL_OFFSET = INSTALL_LBA * SECTOR
INSTALL_SIZE = 3201322926
ORIGINAL_ESD_SHA = "77668ca0242b42056c9458482da61c01469cb8528c14744e20888f476b3c8a69"
CHUNK = 8 * 1024 * 1024
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

class BuildError(RuntimeError):
    pass

def require(condition, message):
    if not condition:
        raise BuildError(message)

def log(message):
    print(f"[ASHER v2] {message}", flush=True)

def run(*args, stdin=None, check=True):
    log("Ejecutando: " + " ".join(map(str, args)))
    result = subprocess.run(
        list(map(str, args)),
        input=stdin, text=stdin is not None, check=False
    )
    if check and result.returncode:
        raise BuildError(f"Comando fallo ({result.returncode}): {args[0]}")
    return result.returncode

def digest_file(path):
    h = hashlib.sha256()
    with open(path, "rb", buffering=CHUNK) as f:
        for chunk in iter(lambda: f.read(CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()

def cut_extent(source, dest, offset, length):
    with open(source, "rb", buffering=CHUNK) as src, open(dest, "wb", buffering=CHUNK) as dst:
        src.seek(offset)
        n = length
        while n:
            b = src.read(min(n, CHUNK))
            require(b, f"Origen incompleto al extraer extent: {source}")
            dst.write(b)
            n -= len(b)

def compare_outside_extent(src, dest):
    size = src.stat().st_size
    require(dest.stat().st_size == size, "Tamano ISO final alterado")
    with open(src, "rb", buffering=CHUNK) as a, open(dest, "rb", buffering=CHUNK) as b:
        for start, end in [(0, INSTALL_OFFSET), (INSTALL_OFFSET + INSTALL_SIZE, size)]:
            a.seek(start)
            b.seek(start)
            while start < end:
                n = min(CHUNK, end - start)
                require(a.read(n) == b.read(n),
                        f"Se cambiaron bytes fuera de install.esd en offset {start}")
                start += n

def compare_extent_prefix(esd, iso, offset):
    with open(esd, "rb", buffering=CHUNK) as a, open(iso, "rb", buffering=CHUNK) as b:
        b.seek(offset)
        while True:
            chunk = a.read(CHUNK)
            if not chunk:
                break
            require(chunk == b.read(len(chunk)), "ESD dentro de ISO no coincide")

def compare_padding_zero(iso, offset, length):
    with open(iso, "rb", buffering=CHUNK) as f:
        f.seek(offset)
        while length:
            chunk = f.read(min(CHUNK, length))
            require(chunk and not any(chunk), "Relleno de install.esd no es cero")
            length -= len(chunk)

def write_utf8(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = textwrap.dedent(content).lstrip().replace("\r\n", "\n")
    if path.suffix.lower() == ".cmd":
        path.write_bytes(normalized.replace("\n", "\r\n").encode("utf-8"))
    else:
        path.write_text(normalized, encoding="utf-8")

def build_assets(work, images_source):
    assets = work / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    raw = []
    if images_source.is_dir():
        raw = sorted(p for p in images_source.rglob("*")
                     if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    else:
        require(images_source.is_file(), f"Faltan imagenes: {images_source}")
        with tarfile.open(images_source, "r:*") as tar:
            members = sorted(
                (m for m in tar.getmembers()
                 if m.isfile() and Path(m.name).suffix.lower() in IMAGE_EXTS),
                key=lambda m: m.name.lower(),
            )
            for i, m in enumerate(members):
                stream = tar.extractfile(m)
                require(stream is not None, f"No se pudo leer imagen {m.name}")
                extracted = assets / f"original_{i:02d}{Path(m.name).suffix.lower()}"
                with open(extracted, "wb") as out:
                    shutil.copyfileobj(stream, out)
                raw.append(extracted)
    require(len(raw) == 5, f"ASHER requiere exactamente cinco imagenes; hay {len(raw)}")
    jpg_dir = assets / "ASHER"
    jpg_dir.mkdir()
    for i, p in enumerate(raw, start=1):
        with Image.open(p) as im:
            im = ImageOps.exif_transpose(im)
            if im.mode in ("P", "RGBA", "LA"):
                bg = Image.new("RGB", im.size, (15, 15, 18))
                if im.mode == "P":
                    im = im.convert("RGBA")
                bg.paste(im, mask=im.getchannel("A") if "A" in im.getbands() else None)
                im = bg
            else:
                im = im.convert("RGB")
            im.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
            im.save(jpg_dir / f"asher{i:02d}.jpg", "JPEG", quality=86,
                    subsampling=0, optimize=True)
    require(len(list(jpg_dir.glob("asher*.jpg"))) == 5,
            "Error preparando las cinco imagenes")
    log("5/5 imagenes ASHER conservadas y preparadas como JPEG 1080p")
    return jpg_dir

def build_scala_payload(work, wallpaper_dir):
    scala = work / "payload" / "SCALA"
    scala.mkdir(parents=True, exist_ok=True)
    write_utf8(scala / "DEDICATORIA.txt", """
    ASHER CALA OS - SCALA Gaming Edition

    Este sistema operativo va dedicado a mi hijo Asher Cala,
    con mucho cariño de su padre Ever Nelson Calamontes,
    a su hijo Asher Cala Quilla.
    """)
    write_utf8(scala / "SYSTEM_SCALA.ps1", r"""
    $ErrorActionPreference = 'Continue'
    function Set-Dword($Path, $Name, $Value) {
      New-Item -Path $Path -Force | Out-Null
      New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType DWord -Force | Out-Null
    }

    # Desactiva captura en segundo plano y publicidad; respeta Store y Gaming Services.
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' 'AllowGameDVR' 0
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsConsumerFeatures' 1
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableTailoredExperiencesWithDiagnosticData' 1
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 1
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' 'StartupBoostEnabled' 0
    Set-Dword 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' 'BackgroundModeEnabled' 0

    # Modo juegos: parametros conservadores. No deshabilitar componentes del kernel.
    $profile = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'
    Set-Dword $profile 'SystemResponsiveness' 10
    Set-Dword $profile 'NetworkThrottlingIndex' 0xffffffff
    $games = "$profile\Tasks\Games"
    Set-Dword $games 'GPU Priority' 8
    Set-Dword $games 'Priority' 6

    # High Performance cuando este disponible, sin cambiar drivers ni BIOS.
    & powercfg.exe /S SCHEME_MIN | Out-Null

    # Se aplica por usuario al iniciar sesion, sin servicio de fondo permanente.
    New-Item 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -Force | Out-Null
    New-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -Name 'SCALA User Gaming' -PropertyType String -Value 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\SCALA\USER_SCALA.ps1"' -Force | Out-Null

    # OEM: identidad de la edicion, no cambia componentes Microsoft del sistema.
    $oem = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\OEMInformation'
    New-Item $oem -Force | Out-Null
    New-ItemProperty $oem -Name 'Manufacturer' -PropertyType String -Value 'SCALA' -Force | Out-Null
    New-ItemProperty $oem -Name 'Model' -PropertyType String -Value 'ASHER CALA OS - SCALA Gaming' -Force | Out-Null
    exit 0
    """)
    write_utf8(scala / "USER_SCALA.ps1", r"""
    $ErrorActionPreference = 'SilentlyContinue'
    function Set-Dword($Path, $Name, $Value) {
      New-Item $Path -Force | Out-Null
      New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType DWord -Force | Out-Null
    }
    Set-Dword 'HKCU:\Software\Microsoft\GameBar' 'AllowAutoGameMode' 1
    Set-Dword 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1
    Set-Dword 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0
    Set-Dword 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0
    $p = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
    Set-Dword $p 'AppsUseLightTheme' 0
    Set-Dword $p 'SystemUsesLightTheme' 0
    Set-Dword $p 'EnableTransparency' 0
    Set-Dword 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarDa' 0
    Set-Dword 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' 'SystemPaneSuggestionsEnabled' 0

    $wallpaper = 'C:\Windows\Web\Wallpaper\ASHER\asher01.jpg'
    if (Test-Path $wallpaper) {
        $reg = 'HKCU:\Control Panel\Desktop'
        New-ItemProperty -Path $reg -Name Wallpaper -Value $wallpaper -PropertyType String -Force | Out-Null
        if (-not ('SCALA.Wallpaper' -as [type])) {
          Add-Type -TypeDefinition @'
    using System;
    using System.Runtime.InteropServices;
    namespace SCALA {
      public class Wallpaper {
        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool SystemParametersInfo(int action, int param, string value, int flags);
      }
    }
    '@
        }
        [SCALA.Wallpaper]::SystemParametersInfo(20, 0, $wallpaper, 3) | Out-Null
    }

    $desktop = [Environment]::GetFolderPath('Desktop')
    if ($desktop) {
       $shortcut = Join-Path $desktop 'SCALA Gaming Center.lnk'
       if (-not (Test-Path $shortcut)) {
           $shell = New-Object -ComObject WScript.Shell
           $lnk = $shell.CreateShortcut($shortcut)
           $lnk.TargetPath = 'C:\SCALA\GAMING_CENTER.cmd'
           $lnk.WorkingDirectory = 'C:\SCALA'
           $lnk.Save()
       }
    }
    exit 0
    """)
    write_utf8(scala / "DIAGNOSTICO.ps1", r"""
    $ErrorActionPreference = 'SilentlyContinue'
    $out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'ASHER_DIAGNOSTICO.txt'
    @(
      'ASHER CALA OS - SCALA Gaming'
      "Fecha: $(Get-Date)"
      (Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, FreePhysicalMemory | Out-String)
      (Get-CimInstance Win32_Processor | Select-Object Name, LoadPercentage | Out-String)
      "Procesos: $((Get-Process).Count)"
      (Get-ItemProperty 'HKCU:\Software\Microsoft\GameBar' | Select-Object AllowAutoGameMode, AutoGameModeEnabled | Out-String)
    ) | Out-File $out -Encoding UTF8
    notepad.exe $out
    """)
    write_utf8(scala / "GAMING_CENTER.cmd", r"""
    @echo off
    title ASHER CALA OS - SCALA Gaming Center
    color 0B
    :menu
    cls
    echo ==========================================
    echo   ASHER CALA OS - SCALA GAMING CENTER
    echo ==========================================
    echo 1. Aplicar Game Mode y tema oscuro
    echo 2. Ver RAM y procesos
    echo 3. Diagnostico de rendimiento
    echo 4. Ver dedicatoria
    echo 0. Salir
    choice /c 12340 /n /m "Opcion: "
    if errorlevel 5 exit /b 0
    if errorlevel 4 goto dedication
    if errorlevel 3 goto diagnostic
    if errorlevel 2 goto taskmgr
    if errorlevel 1 goto profile
    goto menu
    :dedication
    notepad "C:\SCALA\DEDICATORIA.txt"
    goto done
    :diagnostic
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\DIAGNOSTICO.ps1"
    goto done
    :taskmgr
    taskmgr.exe
    goto done
    :profile
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\USER_SCALA.ps1"
    :done
    pause
    goto menu
    """)
    wrap = work / "payload" / "SetupComplete.cmd"
    write_utf8(wrap, r"""
    @echo off
    if exist "%WINDIR%\Setup\Scripts\SetupComplete_MINIOS.cmd" call "%WINDIR%\Setup\Scripts\SetupComplete_MINIOS.cmd"
    if exist "C:\SCALA\SYSTEM_SCALA.ps1" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SCALA\SYSTEM_SCALA.ps1"
    exit /b 0
    """)
    return scala, wrap

def wim_dir(wim, path):
    return run("wimlib-imagex", "dir", wim, "1", f"--path={path}", check=False) == 0

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path,
                        default=Path.home() / "Descargas/MiniOS11 X-24H2 v26.06 x64.iso")
    parser.add_argument("--images", type=Path,
                        default=Path.home() / "Escritorio/ASHERIMAGENES")
    parser.add_argument("--output", type=Path,
                        default=Path.home() / "Descargas/ASHER_CALA_OS_SCALA_GAMING_v2_x64.iso")
    parser.add_argument("--work", type=Path,
                        default=Path.home() / ".cache/scala-asher-v2")
    args = parser.parse_args()

    for program in ("wimlib-imagex", "xorriso"):
        require(shutil.which(program), f"Falta herramienta {program}")
    src, out, work = args.source.resolve(), args.output.absolute(), args.work.absolute()
    require(src.is_file(), f"Falta ISO original: {src}")
    require(not out.exists(), f"No sobrescribire ISO existente: {out}")
    require(src.stat().st_size == ORIGINAL_SIZE, "ISO original: tamano inesperado")
    log("Verificando SHA-256 de la ISO fuente")
    require(digest_file(src) == ORIGINAL_SHA, "SHA-256 de ISO original no coincide")
    require(not work.exists() or (work / ".scala-v2").is_file(),
            f"Directorio de trabajo no pertenece a SCALA v2: {work}")
    # Preserve earlier work on errors. Do not erase manually-created directories.
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    (work / ".scala-v2").write_text("SCALA ASHER V2", encoding="utf-8")
    log("ISO fuente: tamaño y SHA-256 CORRECTOS")

    original_esd = work / "original.esd"
    wim = work / "work.wim"
    edited_esd = work / "edited.esd"
    temp_iso = out.with_name(out.name + ".building")
    require(not temp_iso.exists(), "Hay un archivo .building anterior; no lo sobreescribire")

    cut_extent(src, original_esd, INSTALL_OFFSET, INSTALL_SIZE)
    require(digest_file(original_esd) == ORIGINAL_ESD_SHA,
            "SHA-256 de install.esd original no coincide")
    run("wimlib-imagex", "verify", original_esd)

    wallpapers = build_assets(work, args.images)
    scala, wrapper = build_scala_payload(work, wallpapers)

    # Preserve existing post-install logic instead of silently replacing it.
    original_setup = work / "minios_setup"
    original_setup.mkdir()
    current_setup = "/Windows/Setup/Scripts/SetupComplete.cmd"
    original_present = False
    if run("wimlib-imagex", "extract", original_esd, "1", current_setup,
           f"--dest-dir={original_setup}", check=False) == 0:
        extracted_files = list(original_setup.rglob("SetupComplete.cmd"))
        require(len(extracted_files) == 1, "SetupComplete original no se extrajo correctamente")
        old = extracted_files[0]
        shutil.copy2(old, work / "payload" / "SetupComplete_MINIOS.cmd")
        original_present = True
    log("SetupComplete MiniOS: " + ("CONSERVADO" if original_present else "no existia dentro del ESD"))

    run("wimlib-imagex", "export", original_esd, "all", wim,
        "--compress=LZX", "--check")
    run("wimlib-imagex", "verify", wim)
    original_esd.unlink()  # Free 3.2 GB before creating the final ESD.

    updates = [
        "delete --recursive --force /Windows/Web/Wallpaper",
        f'add "{wallpapers}" /Windows/Web/Wallpaper/ASHER',
        f'add "{wallpapers / "asher01.jpg"}" /Windows/Web/Wallpaper/Windows/img0.jpg',
        f'add "{scala}" /SCALA',
    ]
    if original_present:
        updates.append(
            f'add "{work / "payload" / "SetupComplete_MINIOS.cmd"}" '
            "/Windows/Setup/Scripts/SetupComplete_MINIOS.cmd"
        )
    updates.extend([
        f'delete --force {current_setup}',
        f'add "{wrapper}" {current_setup}',
    ])
    run("wimlib-imagex", "update", wim, "1", "--check",
        stdin="\n".join(updates) + "\n")
    run("wimlib-imagex", "verify", wim)

    for f in ("DEDICATORIA.txt", "SYSTEM_SCALA.ps1", "USER_SCALA.ps1",
              "GAMING_CENTER.cmd"):
        require(wim_dir(wim, f"/SCALA/{f}"), f"Falta payload: SCALA/{f}")
    for n in range(1, 6):
        require(wim_dir(wim, f"/Windows/Web/Wallpaper/ASHER/asher{n:02d}.jpg"),
                f"Falta fondo ASHER numero {n}")
    require(wim_dir(wim, current_setup), "Falta SetupComplete final")
    if original_present:
        require(wim_dir(wim, "/Windows/Setup/Scripts/SetupComplete_MINIOS.cmd"),
                "Falta SetupComplete MiniOS conservado")

    run("wimlib-imagex", "export", wim, "all", edited_esd,
        "--compress=LZMS:100", "--solid", "--check")
    run("wimlib-imagex", "verify", edited_esd)
    new_size = edited_esd.stat().st_size
    require(new_size <= INSTALL_SIZE,
            f"ESD no cabe: original {INSTALL_SIZE}; nuevo {new_size}; "
            f"exceso {new_size - INSTALL_SIZE}. Original intacto.")
    log(f"ESD cabe en el extent original: {new_size}/{INSTALL_SIZE} bytes")

    # Exact-copy source ISO; overwrite ONLY verified existing ESD extent.
    run("cp", "--reflink=auto", src, temp_iso)
    with open(temp_iso, "r+b", buffering=CHUNK) as f, \
         open(edited_esd, "rb", buffering=CHUNK) as incoming:
        f.seek(INSTALL_OFFSET)
        shutil.copyfileobj(incoming, f, CHUNK)
        left = INSTALL_SIZE - new_size
        if left:
            zero = bytes(CHUNK)
            while left:
                count = min(left, CHUNK)
                f.write(zero[:count])
                left -= count
        f.flush()
        os.fsync(f.fileno())

    compare_outside_extent(src, temp_iso)
    compare_extent_prefix(edited_esd, temp_iso, INSTALL_OFFSET)
    compare_padding_zero(temp_iso, INSTALL_OFFSET + new_size,
                         INSTALL_SIZE - new_size)
    require(temp_iso.stat().st_size == ORIGINAL_SIZE, "Tamano ISO cambiado")

    # The boot/ISO9660/UDF descriptors and BCD are outside the ESD extent.
    log("VERIFICADO: todos los bytes fuera de install.esd identicos")
    run("xorriso", "-indev", temp_iso, "-report_el_torito", "plain")
    final_sha = digest_file(temp_iso)
    # Published as candidate until hardware boot/install has been tested.
    out.parent.mkdir(parents=True, exist_ok=True)
    temp_iso.rename(out)
    report = out.with_suffix(out.suffix + ".SHA256.txt")
    report.write_text(
        f"BASE_SHA256={ORIGINAL_SHA}\n"
        f"FINAL_SHA256={final_sha}\n"
        f"FINAL_SIZE={out.stat().st_size}\n"
        f"INSTALL_ESD_SIZE={new_size}\n"
        "TEST_VM=NO_EJECUTADO\nTEST_HARDWARE=NO_EJECUTADO\n",
        encoding="utf-8")
    log(f"ISO candidata construida: {out}")
    log(f"TAMANO: {out.stat().st_size} | SHA256: {final_sha}")
    log("ESTADO: pendiente prueba real de arranque e instalacion.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, BuildError, subprocess.CalledProcessError) as exc:
        print(f"[ASHER v2] ERROR REAL: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
