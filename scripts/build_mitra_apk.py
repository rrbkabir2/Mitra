import os
import sys
import shutil
import subprocess
import re
import json
import urllib.request
import zipfile
from PIL import Image

def find_java():
    # 1. Try PATH
    j = shutil.which('java')
    if j:
        return j
    # 2. Tableau JRE known path
    tableau_java = r'C:\Program Files\Tableau\Tableau Public 2026.2\bin\jre\bin\java.exe'
    if os.path.exists(tableau_java):
        return tableau_java
    # 3. Standard JRE / JDK paths
    for p in [r'C:\Program Files\Java', r'C:\Program Files (x86)\Java']:
        if os.path.exists(p):
            for root, dirs, files in os.walk(p):
                if 'java.exe' in files:
                    return os.path.join(root, 'java.exe')
    return 'java'

def ensure_tools():
    tools_dir = os.path.abspath('scripts/tools')
    os.makedirs(tools_dir, exist_ok=True)
    
    # AAPT2
    aapt2_exe = os.path.join(tools_dir, 'aapt2.exe')
    if not os.path.exists(aapt2_exe):
        print('[Mitra APK Builder] Downloading official Google AAPT2 binary...')
        url = 'https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.2.2-10154469/aapt2-8.2.2-10154469-windows.jar'
        jar_path = os.path.join(tools_dir, 'aapt2-windows.jar')
        urllib.request.urlretrieve(url, jar_path)
        with zipfile.ZipFile(jar_path, 'r') as z:
            z.extract('aapt2.exe', tools_dir)
        print('[Mitra APK Builder] Extracted aapt2.exe.')

    # Apktool
    apktool_jar = os.path.join(tools_dir, 'apktool.jar')
    if not os.path.exists(apktool_jar):
        print('[Mitra APK Builder] Downloading Apktool 2.10.0...')
        url = 'https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar'
        urllib.request.urlretrieve(url, apktool_jar)
        print('[Mitra APK Builder] Downloaded apktool.jar.')

    # Platform-tools (ADB)
    adb_exe = os.path.join(tools_dir, 'platform-tools', 'adb.exe')
    if not os.path.exists(adb_exe):
        print('[Mitra APK Builder] Downloading official Android platform-tools...')
        url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
        zip_path = os.path.join(tools_dir, 'platform-tools.zip')
        urllib.request.urlretrieve(url, zip_path)
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(tools_dir)
        print('[Mitra APK Builder] Extracted platform-tools (adb.exe).')

    return aapt2_exe, apktool_jar, adb_exe

def render_all_icons():
    from render_icons import main as render_main
    print('[Mitra APK Builder] Rendering crystal-clear Mitra milk-bottle icons across all densities...')
    render_main()

def prepare_apk_source(apktool_jar, java_exe):
    base_apk = 'scripts/original_base.apk'
    src_dir = 'scripts/apk_src'
    
    # If base apk doesn't exist, check git or downloads
    if not os.path.exists(base_apk):
        print('[Mitra APK Builder] Extracting base APK from repository history...')
        proc = subprocess.run(['git', 'show', '20804cf:public/downloads/mitra-v0.2.apk'], capture_output=True)
        if len(proc.stdout) > 1000000:
            with open(base_apk, 'wb') as f:
                f.write(proc.stdout)
        else:
            raise RuntimeError('Could not locate original base APK.')

    # If apk_src is missing or corrupted, decompile
    manifest_path = os.path.join(src_dir, 'AndroidManifest.xml')
    if not os.path.exists(manifest_path):
        print(f'[Mitra APK Builder] Decompiling {base_apk} with Apktool...')
        subprocess.check_call([java_exe, '-jar', apktool_jar, 'd', base_apk, '-o', src_dir, '-f'])

    # Apply all branding and density icons
    from setup_apk_resources import setup_resources
    setup_resources()

def build_and_sign(aapt2_exe, apktool_jar, java_exe):
    src_dir = 'scripts/apk_src'
    unsigned_apk = 'scripts/mitra-unsigned.apk'
    signed_apk = 'scripts/mitra-signed.apk'
    keystore = 'scripts/mitra-release.keystore'
    alias = 'mitra'
    storepass = 'mitra2026'
    uber_signer = 'scripts/uber-apk-signer.jar'

    print('[Mitra APK Builder] Compiling resources and packaging APK with AAPT2...')
    cmd_build = [
        java_exe,
        '-jar', apktool_jar,
        'b', src_dir,
        '-o', unsigned_apk,
        '--use-aapt2',
        '--aapt', aapt2_exe
    ]
    subprocess.check_call(cmd_build)

    print('[Mitra APK Builder] ZipAligning and Signing APK (v1, v2, v3 schemes)...')
    shutil.copyfile(unsigned_apk, signed_apk)
    cmd_sign = [
        java_exe,
        '-jar', uber_signer,
        '-a', signed_apk,
        '--ks', keystore,
        '--ksAlias', alias,
        '--ksPass', storepass,
        '--ksKeyPass', storepass,
        '--allowResign',
        '--overwrite',
        '--verbose'
    ]
    subprocess.check_call(cmd_sign)

    print('[Mitra APK Builder] Verifying APK signature and zipalign...')
    cmd_verify = [java_exe, '-jar', uber_signer, '-y', '-a', signed_apk]
    subprocess.check_call(cmd_verify)

    return signed_apk

def verify_badging(aapt2_exe, signed_apk):
    print('[Mitra APK Builder] Verifying APK Badging and Resource Densities with AAPT2...')
    badging = subprocess.check_output([aapt2_exe, 'dump', 'badging', signed_apk], text=True, errors='ignore')
    for line in badging.split('\n'):
        if 'application:' in line or 'application-label:' in line or 'application-icon-' in line:
            print(f'   [AAPT2 Badging] {line}')

    # Check mipmap resources
    resources = subprocess.check_output([aapt2_exe, 'dump', 'resources', signed_apk], text=True, errors='ignore')
    mipmap_section = False
    print('[Mitra APK Builder] Verified Mipmap Density Entries:')
    for line in resources.split('\n'):
        if 'type mipmap' in line:
            mipmap_section = True
        elif mipmap_section and 'type ' in line and not 'mipmap' in line:
            mipmap_section = False
        if mipmap_section and ('resource ' in line or '(' in line):
            print(f'   {line.strip()}')

def deploy_apk(signed_apk):
    downloads_dir = 'public/downloads'
    os.makedirs(downloads_dir, exist_ok=True)
    out_v1_0 = os.path.join(downloads_dir, 'mitra-v1.0.apk')
    
    shutil.copyfile(signed_apk, out_v1_0)
    
    # Point 44: Keep only current (v1.0) + one previous fallback (v0.2). Delete v0.1 and all .idsig files.
    for fname in os.listdir(downloads_dir):
        fpath = os.path.join(downloads_dir, fname)
        if fname.endswith('.idsig') or fname == 'mitra-v0.1.apk':
            try:
                os.remove(fpath)
                print(f'[Mitra APK Builder] Cleaned up legacy file: {fname}')
            except Exception as e:
                print(f'[Mitra APK Builder] Could not remove {fname}: {e}')
                
    size_mb = os.path.getsize(out_v1_0) / (1024 * 1024)
    print(f'[Mitra APK Builder] Successfully deployed genuine branded APK to {out_v1_0} ({size_mb:.2f} MB)!')

def check_attached_devices(adb_exe, signed_apk):
    print('[Mitra APK Builder] Checking for attached Android devices...')
    try:
        out = subprocess.check_output([adb_exe, 'devices'], text=True, errors='ignore')
        lines = [line.strip() for line in out.strip().split('\n')[1:] if line.strip()]
        devices = [line.split()[0] for line in lines if '\tdevice' in line]
        if devices:
            for dev in devices:
                print(f'[Mitra APK Builder] Found connected Android device: {dev}')
                print(f'[Mitra APK Builder] Installing {signed_apk} onto device {dev}...')
                subprocess.check_call([adb_exe, '-s', dev, 'install', '-r', signed_apk])
                print(f'[Mitra APK Builder] Installed successfully on {dev}!')
                # Launch the app
                subprocess.run([adb_exe, '-s', dev, 'shell', 'monkey', '-p', 'net.mikespub.mywebview', '-c', 'android.intent.category.LAUNCHER', '1'], capture_output=True)
                print(f'[Mitra APK Builder] Launched Mitra on {dev}.')
                # Take home screen screenshot
                os.makedirs('scripts/screenshots', exist_ok=True)
                screen_path = os.path.join('scripts/screenshots', f'{dev}_icon_screen.png')
                with open(screen_path, 'wb') as sf:
                    subprocess.run([adb_exe, '-s', dev, 'exec-out', 'screencap', '-p'], stdout=sf)
                print(f'[Mitra APK Builder] Captured device screen to {screen_path}')
        else:
            print('[Mitra APK Builder] No physical Android device connected via ADB.')
            print('   -> To install automatically on your phone: enable USB Debugging, plug phone in via USB, and re-run build.')
            print('   -> Or download directly on your phone: open https://mitra-beryl.vercel.app/ and download the APK.')
    except Exception as e:
        print(f'[Mitra APK Builder] ADB check note: {e}')

def main():
    print('====================================================')
    print('   Mitra Android APK Packaging & Icon System Build   ')
    print('====================================================')
    java_exe = find_java()
    print(f'[Mitra APK Builder] Using Java: {java_exe}')
    
    aapt2_exe, apktool_jar, adb_exe = ensure_tools()
    render_all_icons()
    prepare_apk_source(apktool_jar, java_exe)
    signed_apk = build_and_sign(aapt2_exe, apktool_jar, java_exe)
    verify_badging(aapt2_exe, signed_apk)
    deploy_apk(signed_apk)
    check_attached_devices(adb_exe, signed_apk)
    print('====================================================')
    print('   Build Complete: Real Mitra App Icon Configured!   ')
    print('====================================================')

if __name__ == '__main__':
    main()
