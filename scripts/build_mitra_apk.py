import os
import sys
import zipfile
import struct
import json
import subprocess
import shutil
from PIL import Image

def rebuild_arsc(arsc_data):
    header_type, header_size, total_size = struct.unpack('<HHI', arsc_data[:8])
    sp_offset = 12
    sp_type, sp_header_size, sp_size = struct.unpack('<HHI', arsc_data[sp_offset:sp_offset+8])
    sp_string_count, sp_style_count, sp_flags, sp_strings_start, sp_styles_start = struct.unpack('<IIIII', arsc_data[sp_offset+8:sp_offset+28])
    orig_offsets = struct.unpack(f'<{sp_string_count}I', arsc_data[sp_offset+28:sp_offset+28+sp_string_count*4])
    pool_data = arsc_data[sp_offset + sp_strings_start:sp_offset + (sp_styles_start if sp_style_count > 0 else sp_size)]

    strings = []
    for off in orig_offsets:
        u16len = pool_data[off]; p = off + (1 if u16len < 128 else 2)
        u8len = pool_data[p]; p += (1 if u8len < 128 else 2)
        strings.append(pool_data[p:p+u8len].decode('utf-8', errors='ignore'))

    for i in range(len(strings)):
        if 'my webview' in strings[i].lower():
            print(f'Replacing arsc string {i}: "{strings[i]}" -> "Mitra"')
            strings[i] = 'Mitra'

    new_pool_data = bytearray()
    new_offsets = []
    for s in strings:
        new_offsets.append(len(new_pool_data))
        encoded = s.encode('utf-8')
        u16len = len(s)
        u8len = len(encoded)
        if u16len < 128:
            new_pool_data.append(u16len)
        else:
            new_pool_data.append(0x80 | ((u16len >> 8) & 0x7f))
            new_pool_data.append(u16len & 0xff)
        if u8len < 128:
            new_pool_data.append(u8len)
        else:
            new_pool_data.append(0x80 | ((u8len >> 8) & 0x7f))
            new_pool_data.append(u8len & 0xff)
        new_pool_data.extend(encoded)
        new_pool_data.append(0)

    while len(new_pool_data) % 4 != 0:
        new_pool_data.append(0)

    offsets_bytes = struct.pack(f'<{len(new_offsets)}I', *new_offsets)
    new_strings_start = 28 + len(offsets_bytes)
    new_styles_start = 0
    new_chunk_size = 28 + len(offsets_bytes) + len(new_pool_data)

    new_sp_header = struct.pack('<HHI', sp_type, sp_header_size, new_chunk_size)
    new_sp_meta = struct.pack('<IIIII', sp_string_count, sp_style_count, sp_flags, new_strings_start, new_styles_start)

    new_sp = new_sp_header + new_sp_meta + offsets_bytes + new_pool_data
    rest_of_arsc = bytearray(arsc_data[sp_offset + sp_size:])

    # Replace launcher background color 0xff008577 (b'\x77\x85\x00\xff') with 0xff183d2d (b'\x2d\x3d\x18\xff')
    old_color = b'\x77\x85\x00\xff'
    new_color = b'\x2d\x3d\x18\xff'
    color_idx = rest_of_arsc.find(old_color)
    if color_idx != -1:
        print(f'Replaced background color at rest offset {color_idx}')
        rest_of_arsc[color_idx:color_idx+4] = new_color

    new_total_size = 12 + len(new_sp) + len(rest_of_arsc)
    new_header = struct.pack('<HHI', header_type, header_size, new_total_size) + arsc_data[8:12]

    return bytes(new_header + new_sp + rest_of_arsc)

def rebuild_qr_xml(data):
    # VectorDrawable AXML
    offset = 8
    sp_tag, sp_size, sp_string_count, sp_style_count, sp_flags, sp_strings_start, sp_styles_start = struct.unpack('<IIIIIII', data[offset:offset+28])
    offsets = struct.unpack(f'<{sp_string_count}I', data[offset+28:offset+28+sp_string_count*4])
    pdata = data[offset+sp_strings_start:offset+sp_size]

    strings = []
    for off in offsets:
        if sp_flags & (1 << 8):
            u16 = pdata[off]; p = off + (1 if u16 < 128 else 2)
            u8 = pdata[p]; p += (1 if u8 < 128 else 2)
            strings.append(pdata[p:p+u8].decode('utf-8', errors='ignore'))
        else:
            u16 = struct.unpack('<H', pdata[off:off+2])[0]; p = off + 2
            strings.append(pdata[p:p+u16*2].decode('utf-16-le', errors='ignore'))

    # Replace string 11 (the vector path) with Mitra milk bottle path
    mitra_vector_path = 'M9,2h6a1.25,1.25 0 0 1 1.25,1.25A1.25,1.25 0 0 1 15,4.5H9A1.25,1.25 0 0 1 7.75,3.25 1.25,1.25 0 0 1 9,2zm1,2.5h4V7l2.5,2.5c0.94,0.94 1.5,2.21 1.5,3.54V19c0,1.66-1.34,3-3,3H9c-1.66,0-3-1.34-3-3v-5.96c0-1.33 0.56-2.6 1.5-3.54L10,7V4.5zm0,13l1.5,1.5 3-3'
    if len(strings) > 11:
        strings[11] = mitra_vector_path

    new_pool_data = bytearray()
    new_offsets = []
    for s in strings:
        new_offsets.append(len(new_pool_data))
        encoded = s.encode('utf-8')
        u16len = len(s)
        u8len = len(encoded)
        if u16len < 128:
            new_pool_data.append(u16len)
        else:
            new_pool_data.append(0x80 | ((u16len >> 8) & 0x7f))
            new_pool_data.append(u16len & 0xff)
        if u8len < 128:
            new_pool_data.append(u8len)
        else:
            new_pool_data.append(0x80 | ((u8len >> 8) & 0x7f))
            new_pool_data.append(u8len & 0xff)
        new_pool_data.extend(encoded)
        new_pool_data.append(0)

    while len(new_pool_data) % 4 != 0:
        new_pool_data.append(0)

    offsets_bytes = struct.pack(f'<{len(new_offsets)}I', *new_offsets)
    new_strings_start = 28 + len(offsets_bytes)
    new_chunk_size = 28 + len(offsets_bytes) + len(new_pool_data)
    new_sp_header = struct.pack('<HHI', sp_tag & 0xffff, 28, new_chunk_size)
    new_sp_meta = struct.pack('<IIIII', sp_string_count, sp_style_count, sp_flags, new_strings_start, 0)
    new_sp = new_sp_header + new_sp_meta + offsets_bytes + new_pool_data

    # Rest of xml
    rest_xml = bytearray(data[offset + sp_size:])
    # Change tint 0xff000000 (b'\x00\x00\x00\xff') to 0xffffffff (b'\xff\xff\xff\xff')
    # Replace black tint/fill with white
    rest_xml = rest_xml.replace(b'\x00\x00\x00\xff', b'\xff\xff\xff\xff')

    new_total_size = 8 + len(new_sp) + len(rest_xml)
    return struct.pack('<II', 0x00080003, new_total_size) + new_sp + bytes(rest_xml)

def create_mitra_splash_html():
    return """<!DOCTYPE html>
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
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="2.5" rx="1.25" fill="#ffffff" />
                <path d="M10 4.5H14V7L16.5 9.5C17.44 10.44 18 11.71 18 13.04V19C18 20.66 16.66 22 15 22H9C7.34 22 6 20.66 6 19V13.04C6 11.71 6.56 10.44 7.5 9.5L10 7V4.5Z" fill="#ffffff" fill-opacity="0.25" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" />
                <path d="M6.5 14.5C7.5 13.8 9.5 13.8 11 14.5C12.5 15.2 14.5 15.2 16 14.5C16.8 14.1 17.5 14.3 17.5 14.5V19C17.5 20.38 16.38 21.5 15 21.5H9C7.62 21.5 6.5 20.38 6.5 19V14.5Z" fill="#ffffff" fill-opacity="0.8" />
                <path d="M10 17.5L11.5 19L14.5 16" stroke="#183d2d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
        <h1>Mitra</h1>
        <p>Connecting to Kabir Bundele Delivery Confirmation Platform...</p>
        <div class="spinner"></div>
    </div>
    <script>
        // Immediately navigate into real Mitra platform
        window.location.replace("https://mitra-beryl.vercel.app/");
    </script>
</body>
</html>
"""

def create_mitra_settings_json():
    return {
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
            ["host", "endsWith", "gstatic.com"]
        ],
        "skip": [
            ["path", "endsWith", ".epub"],
            ["query", "contains", "type=epub"]
        ],
        "remote_debug": False,
        "console_log": False,
        "js_interface": True,
        "context_menu": False,
        "not_matching": False,
        "local_sites": False,
        "update_zip": "",
        "web_settings": {
            "JavaScriptEnabled": True,
            "DomStorageEnabled": True,
            "DatabaseEnabled": True
        },
        "source": "assets",
        "timestamp": "2026-10-16T14:30:00Z"
    }

def main():
    src_apk = 'public/downloads/mitra-v0.2.apk'
    out_apk_unsigned = 'scripts/mitra-unsigned.apk'
    out_apk_signed = 'public/downloads/mitra-v0.2.apk'
    apk_v1 = 'public/downloads/mitra-v0.1.apk'

    print(f'[Mitra APK Builder] Processing {src_apk}...')
    zin = zipfile.ZipFile(src_apk, 'r')

    # Load pre-generated PNG icons
    icon_48_data = open('scripts/icons/icon_48.png', 'rb').read()
    icon_72_data = open('scripts/icons/icon_72.png', 'rb').read()
    icon_96_data = open('scripts/icons/icon_96.png', 'rb').read()
    icon_144_data = open('scripts/icons/icon_144.png', 'rb').read()
    icon_192_data = open('scripts/icons/icon_192.png', 'rb').read()

    zout = zipfile.ZipFile(out_apk_unsigned, 'w', compression=zipfile.ZIP_DEFLATED)

    for item in zin.infolist():
        fname = item.filename
        # Skip old signatures in META-INF
        if fname.startswith('META-INF/') and (fname.endswith('.SF') or fname.endswith('.RSA') or fname.endswith('.DSA') or fname == 'META-INF/MANIFEST.MF'):
            continue

        raw = zin.read(fname)

        if fname == 'resources.arsc':
            print('[Mitra APK Builder] Patching resources.arsc (app name & background)...')
            raw = rebuild_arsc(raw)
        elif fname == 'res/Qr.xml':
            print('[Mitra APK Builder] Patching res/Qr.xml (milk bottle VectorDrawable)...')
            raw = rebuild_qr_xml(raw)
        elif fname in ['assets/settings.json', 'assets/local/config.json']:
            print(f'[Mitra APK Builder] Patching {fname} (routing to mitra-beryl.vercel.app)...')
            if fname == 'assets/settings.json':
                raw = json.dumps(create_mitra_settings_json(), indent=2).encode('utf-8')
            else:
                raw = json.dumps({"sites": {"demo/index.html": "Mitra"}, "bundles": [], "prefix": "https://appassets.androidplatform.net/sites/"}).encode('utf-8')
        elif fname in ['assets/web/index.html', 'assets/local/index.html', 'assets/demo/index.html']:
            print(f'[Mitra APK Builder] Patching {fname} (branded splash & redirect)...')
            raw = create_mitra_splash_html().encode('utf-8')
        elif fname.startswith('res/') and fname.endswith('.png') and not fname.endswith('.9.png'):
            # Replace legacy icon PNGs based on size
            if raw.startswith(b'\x89PNG\r\n\x1a\n'):
                w, h = struct.unpack('>II', raw[16:24])
                if w == 48:
                    raw = icon_48_data
                elif w == 72:
                    raw = icon_72_data
                elif w == 96:
                    raw = icon_96_data
                elif w == 144:
                    raw = icon_144_data
                elif w >= 192:
                    raw = icon_192_data

        zout.writestr(item, raw)

    zout.close()
    zin.close()
    print('[Mitra APK Builder] Repackaged unsigned APK successfully.')

    # Java JRE Tools
    jre_bin = r'C:\Program Files\Tableau\Tableau Public 2026.2\bin\jre\bin'
    keytool = os.path.join(jre_bin, 'keytool.exe')
    jarsigner = os.path.join(jre_bin, 'jarsigner.exe')

    keystore = 'scripts/mitra-release.keystore'
    alias = 'mitra'
    storepass = 'mitra2026'

    if not os.path.exists(keystore):
        print('[Mitra APK Builder] Generating release keystore...')
        cmd_gen = [
            keytool,
            '-genkeypair', '-v',
            '-keystore', keystore,
            '-alias', alias,
            '-keyalg', 'RSA',
            '-keysize', '2048',
            '-validity', '10000',
            '-storepass', storepass,
            '-keypass', storepass,
            '-dname', 'CN=Mitra, OU=DeliveryConfirmation, O=KabirBundele, L=Mumbai, ST=Maharashtra, C=IN'
        ]
        subprocess.check_call(cmd_gen)

    uber_signer = 'scripts/uber-apk-signer.jar'
    java_exe = os.path.join(jre_bin, 'java.exe')

    print('[Mitra APK Builder] ZipAligning and Signing APK with uber-apk-signer (v1, v2, v3 schemes)...')
    shutil.copyfile(out_apk_unsigned, out_apk_signed)
    cmd_sign = [
        java_exe,
        '-jar', uber_signer,
        '-a', out_apk_signed,
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
    cmd_verify = [java_exe, '-jar', uber_signer, '-y', '-a', out_apk_signed]
    subprocess.check_call(cmd_verify)

    # Copy to v0.1 as well
    shutil.copyfile(out_apk_signed, apk_v1)
    size_mb = os.path.getsize(out_apk_signed) / (1024 * 1024)
    print(f'[Mitra APK Builder] SUCCESS! Branded signed APK ready: {out_apk_signed} ({size_mb:.2f} MB)')

if __name__ == '__main__':
    main()
