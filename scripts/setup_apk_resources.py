import os
import shutil
import re
import json

def setup_resources():
    src_dir = os.path.abspath('scripts/apk_src')
    rendered_icons = os.path.abspath('scripts/icons_rendered')
    
    # 1. Update colors.xml
    colors_path = os.path.join(src_dir, 'res', 'values', 'colors.xml')
    if os.path.exists(colors_path):
        with open(colors_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'<color name="ic_launcher_background">.*?</color>', '<color name="ic_launcher_background">#ff183d2d</color>', content)
        content = re.sub(r'<color name="colorPrimary">.*?</color>', '<color name="colorPrimary">#ff183d2d</color>', content)
        content = re.sub(r'<color name="colorPrimaryDark">.*?</color>', '<color name="colorPrimaryDark">#ff0f281e</color>', content)
        with open(colors_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated colors.xml (#183d2d Mitra dark green)')

    # 2. Update strings.xml in all values* folders
    res_dir = os.path.join(src_dir, 'res')
    for d in os.listdir(res_dir):
        if d.startswith('values'):
            s_path = os.path.join(res_dir, d, 'strings.xml')
            if os.path.exists(s_path):
                with open(s_path, 'r', encoding='utf-8') as f:
                    s_content = f.read()
                if 'name="app_name"' in s_content:
                    s_content = re.sub(r'<string name="app_name">.*?</string>', '<string name="app_name">Mitra</string>', s_content)
                    with open(s_path, 'w', encoding='utf-8') as f:
                        f.write(s_content)
    print('Updated all strings.xml with app_name = Mitra')

    # 3. Create density mipmap and drawable folders
    densities = {
        'mdpi': 'mdpi',
        'hdpi': 'hdpi',
        'xhdpi': 'xhdpi',
        'xxhdpi': 'xxhdpi',
        'xxxhdpi': 'xxxhdpi',
    }

    for dens in densities.keys():
        mipmap_dir = os.path.join(res_dir, f'mipmap-{dens}')
        drawable_dir = os.path.join(res_dir, f'drawable-{dens}')
        os.makedirs(mipmap_dir, exist_ok=True)
        os.makedirs(drawable_dir, exist_ok=True)

        # Copy launcher icons
        shutil.copyfile(os.path.join(rendered_icons, f'ic_launcher_{dens}.png'), os.path.join(mipmap_dir, 'ic_launcher.png'))
        shutil.copyfile(os.path.join(rendered_icons, f'ic_launcher_round_{dens}.png'), os.path.join(mipmap_dir, 'ic_launcher_round.png'))
        shutil.copyfile(os.path.join(rendered_icons, f'ic_launcher_fg_{dens}.png'), os.path.join(drawable_dir, 'ic_launcher_foreground.png'))
        print(f'Copied density assets for {dens}: ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png')

    # 4. Adaptive icon XMLs in mipmap-anydpi-v26 and mipmap-anydpi
    adaptive_xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
"""
    for folder in ['mipmap-anydpi-v26', 'mipmap-anydpi']:
        target_f = os.path.join(res_dir, folder)
        os.makedirs(target_f, exist_ok=True)
        with open(os.path.join(target_f, 'ic_launcher.xml'), 'w', encoding='utf-8') as f:
            f.write(adaptive_xml)
        with open(os.path.join(target_f, 'ic_launcher_round.xml'), 'w', encoding='utf-8') as f:
            f.write(adaptive_xml)
    print('Configured adaptive-icon XMLs in mipmap-anydpi and mipmap-anydpi-v26')

    # 5. Foreground VectorDrawable
    vector_fg = """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:scaleX="2.4"
        android:scaleY="2.4"
        android:translateX="25.2"
        android:translateY="25.2">
        <!-- Bottle Cap -->
        <path
            android:fillColor="#FFFFFFFF"
            android:pathData="M9,2h6a1.25,1.25 0 0,1 1.25,1.25v0a1.25,1.25 0 0,1 -1.25,1.25H9a1.25,1.25 0 0,1 -1.25,-1.25v0a1.25,1.25 0 0,1 1.25,-1.25z" />
        <!-- Bottle Neck & Body Outline -->
        <path
            android:fillColor="#38FFFFFF"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="1.75"
            android:strokeLineJoin="round"
            android:pathData="M10,4.5H14V7L16.5,9.5C17.44,10.44 18,11.71 18,13.04V19C18,20.66 16.66,22 15,22H9C7.34,22 6,20.66 6,19V13.04C6,11.71 6.56,10.44 7.5,9.5L10,7V4.5Z" />
        <!-- Milk Level Wave Fill -->
        <path
            android:fillColor="#E0FFFFFF"
            android:pathData="M6.5,14.5C7.5,13.8 9.5,13.8 11,14.5C12.5,15.2 14.5,15.2 16,14.5C16.8,14.1 17.5,14.3 17.5,14.5V19C17.5,20.38 16.38,21.5 15,21.5H9C7.62,21.5 6.5,20.38 6.5,19V14.5Z" />
        <!-- Trust Checkmark Inside Milk -->
        <path
            android:strokeColor="#183D2D"
            android:strokeWidth="1.6"
            android:strokeLineCap="round"
            android:strokeLineJoin="round"
            android:pathData="M10,17.5L11.5,19L14.5,16" />
    </group>
</vector>
"""
    drawable_dir = os.path.join(res_dir, 'drawable')
    with open(os.path.join(drawable_dir, 'ic_launcher_foreground.xml'), 'w', encoding='utf-8') as f:
        f.write(vector_fg)
    print('Configured VectorDrawable ic_launcher_foreground.xml')

    # 6. Assets configuration
    assets_dir = os.path.join(src_dir, 'assets')
    settings_data = {
        "sites": [
            {
                "url": "https://mitra-beryl.vercel.app/",
                "title": "Mitra"
            }
        ],
        "other": "https://mitra-beryl.vercel.app/",
        "match": [
            ["host", "equals", "mitra-beryl.vercel.app"],
            ["host", "endsWith", "vercel.app"],
            ["host", "endsWith", "supabase.co"],
            ["host", "endsWith", "google.com"],
            ["host", "endsWith", "google.co.in"],
            ["host", "endsWith", "googleapis.com"],
            ["host", "endsWith", "googleusercontent.com"],
            ["host", "endsWith", "gstatic.com"],
            ["host", "equals", "wa.me"],
            ["host", "endsWith", "whatsapp.com"],
            ["host", "endsWith", "linkedin.com"],
            ["host", "endsWith", "github.com"],
            ["scheme", "equals", "whatsapp"],
            ["scheme", "equals", "mailto"],
            ["scheme", "equals", "tel"]
        ],
        "skip": [
            ["host", "equals", "wa.me"],
            ["host", "endsWith", "whatsapp.com"],
            ["host", "endsWith", "linkedin.com"],
            ["host", "endsWith", "github.com"],
            ["scheme", "equals", "whatsapp"],
            ["scheme", "equals", "mailto"],
            ["scheme", "equals", "tel"],
            ["path", "endsWith", ".apk"],
            ["path", "endsWith", ".pdf"],
            ["path", "endsWith", ".txt"],
            ["path", "endsWith", ".csv"],
            ["path", "contains", "/downloads/"],
            ["path", "contains", "/api/reports/download"],
            ["query", "contains", "download="],
            ["path", "endsWith", ".epub"],
            ["query", "contains", "type=epub"]
        ],
        "remote_debug": False,
        "console_log": False,
        "js_interface": True,
        "context_menu": False,
        "not_matching": True,
        "local_sites": False,
        "update_zip": "",
        "web_settings": {
            "JavaScriptEnabled": True,
            "DomStorageEnabled": True,
            "DatabaseEnabled": True,
            "AllowFileAccess": True,
            "AllowContentAccess": True
        },
        "source": "assets",
        "timestamp": "2026-10-22T10:00:00Z"
    }
    with open(os.path.join(assets_dir, 'settings.json'), 'w', encoding='utf-8') as f:
        json.dump(settings_data, f, indent=2)

    config_local = {
        "sites": {
            "demo/index.html": "Mitra"
        },
        "bundles": [],
        "prefix": "https://appassets.androidplatform.net/sites/"
    }
    os.makedirs(os.path.join(assets_dir, 'local'), exist_ok=True)
    with open(os.path.join(assets_dir, 'local', 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config_local, f, indent=2)

    splash_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Mitra</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #183d2d;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
            text-align: center;
        }
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 320px;
        }
        .icon-box {
            width: 84px;
            height: 84px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        h1 {
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 0.35rem;
        }
        p {
            font-size: 0.88rem;
            opacity: 0.85;
            line-height: 1.4;
            margin-bottom: 1.75rem;
        }
        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255, 255, 255, 0.25);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-box">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="2.5" rx="1.25" fill="#ffffff" />
                <path d="M10 4.5H14V7L16.5 9.5C17.44 10.44 18 11.71 18 13.04V19C18 20.66 16.66 22 15 22H9C7.34 22 6 20.66 6 19V13.04C6 11.71 6.56 10.44 7.5 9.5L10 7V4.5Z" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" />
                <path d="M6.5 14.5C7.5 13.8 9.5 13.8 11 14.5C12.5 15.2 14.5 15.2 16 14.5C16.8 14.1 17.5 14.3 17.5 14.5V19C17.5 20.38 16.38 21.5 15 21.5H9C7.62 21.5 6.5 20.38 6.5 19V14.5Z" fill="#ffffff" fill-opacity="0.88" />
                <path d="M10 17.5L11.5 19L14.5 16" stroke="#183d2d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
        <h1>Mitra</h1>
        <p>Connecting to Delivery Confirmation Platform...</p>
        <div class="spinner"></div>
    </div>
    <script>
        window.location.replace("https://mitra-beryl.vercel.app/");
    </script>
</body>
</html>
"""
    for sub in ['web', 'local', 'demo']:
        p = os.path.join(assets_dir, sub)
        os.makedirs(p, exist_ok=True)
        with open(os.path.join(p, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(splash_html)

    print('Assets configured with Mitra splash and redirection.')

    # 7. Patch AndroidManifest.xml (Camera permissions, features, queries)
    manifest_path = os.path.join(src_dir, 'AndroidManifest.xml')
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            man_content = f.read()
        if 'android.permission.CAMERA' not in man_content:
            man_content = man_content.replace(
                '<uses-permission android:name="android.permission.INTERNET"/>',
                '<uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.CAMERA"/>\n    <uses-permission android:maxSdkVersion="29" android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>\n    <uses-feature android:name="android.hardware.camera" android:required="false"/>\n    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false"/>'
            )
        if 'android.media.action.IMAGE_CAPTURE' not in man_content:
            man_content = man_content.replace(
                '<queries>',
                '<queries>\n        <intent>\n            <action android:name="android.media.action.IMAGE_CAPTURE"/>\n        </intent>\n        <intent>\n            <action android:name="android.intent.action.VIEW"/>\n            <data android:scheme="whatsapp"/>\n        </intent>\n        <intent>\n            <action android:name="android.intent.action.VIEW"/>\n            <data android:scheme="mailto"/>\n        </intent>\n        <intent>\n            <action android:name="android.intent.action.VIEW"/>\n            <data android:scheme="tel"/>\n        </intent>'
            )
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(man_content)
        print('Verified AndroidManifest.xml Camera, Queries, and Storage Permissions.')

    # 8. Patch filepaths.xml
    fp_path = os.path.join(src_dir, 'res', 'xml', 'filepaths.xml')
    if os.path.exists(fp_path):
        with open(fp_path, 'r', encoding='utf-8') as f:
            fp_content = f.read()
        if '<cache-path' not in fp_content:
            fp_content = fp_content.replace(
                '<paths\n  xmlns:android="http://schemas.android.com/apk/res/android">',
                '<paths\n  xmlns:android="http://schemas.android.com/apk/res/android">\n    <cache-path name="cache" path="." />\n    <files-path name="internal" path="." />\n    <external-cache-path name="ext_cache" path="." />'
            )
            with open(fp_path, 'w', encoding='utf-8') as f:
                f.write(fp_content)
        print('Verified filepaths.xml cache and internal paths.')

    # 9. Ensure Toast is removed from MainActivity$6.smali
    m6_path = os.path.join(src_dir, 'smali', 'net', 'mikespub', 'mywebview', 'MainActivity$6.smali')
    if os.path.exists(m6_path):
        with open(m6_path, 'r', encoding='utf-8') as f:
            m6_content = f.read()
        if 'Toast;->makeText' in m6_content:
            m6_content = re.sub(r'invoke-static.*?Toast;->makeText.*?Toast;->show\(\)V\s*', '', m6_content, flags=re.DOTALL)
            with open(m6_path, 'w', encoding='utf-8') as f:
                f.write(m6_content)
            print('Removed console Toast from MainActivity$6.smali.')

    # 10. Update apktool.yml with dynamic versioning from src/lib/version.ts (Point 69)
    version_file = os.path.abspath('src/lib/version.ts')
    version = '1.1'
    build = 2
    if os.path.exists(version_file):
        with open(version_file, 'r', encoding='utf-8') as f:
            v_content = f.read()
        m_ver = re.search(r"APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]", v_content)
        m_bld = re.search(r"APP_BUILD\s*=\s*(\d+)", v_content)
        if m_ver:
            version = m_ver.group(1)
        if m_bld:
            build = int(m_bld.group(1))

    apktool_yml_path = os.path.join(src_dir, 'apktool.yml')
    if os.path.exists(apktool_yml_path):
        with open(apktool_yml_path, 'r', encoding='utf-8') as f:
            yml_content = f.read()
        yml_content = re.sub(r'versionCode:\s*.*', f'versionCode: {build}', yml_content)
        yml_content = re.sub(r'versionName:\s*.*', f"versionName: '{version}'", yml_content)
        with open(apktool_yml_path, 'w', encoding='utf-8') as f:
            f.write(yml_content)
        print(f'Updated apktool.yml to versionCode: {build}, versionName: {version}')

if __name__ == '__main__':
    setup_resources()

