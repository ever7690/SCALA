#!/usr/bin/env bash
set -Eeuo pipefail
echo "=== SCALA ASHER V2 ISOLATED CLOUD BUILD ==="
sudo rm -rf /usr/local/lib/android /usr/share/dotnet /opt/ghc /usr/local/share/powershell /opt/hostedtoolcache/CodeQL || :
sudo apt-get update -qq
sudo apt-get install -y -qq 7zip wimtools xorriso python3-pil jq
df -h /

# Generate an ephemeral, runner-only RSA private key.
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$RUNNER_TEMP/asher-private.pem" >/dev/null 2>&1
mkdir -p cloud
openssl rsa -in "$RUNNER_TEMP/asher-private.pem" -noout -modulus | sed 's/^Modulus=//' > cloud/ASHER_V2_BRIDGE_MODULUS_CHUNKED.txt
git config user.email "actions@users.noreply.github.com"
git config user.name "SCALA Cloud Builder"
git add cloud/ASHER_V2_BRIDGE_MODULUS_CHUNKED.txt
git commit -m "Publish ephemeral ASHER RSA public key"
git push origin HEAD:main
echo 'PUBLIC_RSA_KEY_READY'

# Fresh verified MiniOS release (different SHA from user's uploaded ISO).
curl -fsSL -A 'Mozilla/5.0' --max-time 40 \
  'https://www.mediafire.com/file/fhp6a26l3v789i3/MiniOS11_X-24H2_v26.06_x64_-_dprojects.rar/file' \
  > "$RUNNER_TEMP/mediafire.html"
python3 - <<'PY'
from pathlib import Path
import html,re,os
p=Path(os.environ['RUNNER_TEMP'])
page=html.unescape((p/'mediafire.html').read_text(errors='replace'))
m=re.search(r'https?://download\d+\.mediafire\.com/[^"\s<>]+',page)
if m is None: raise SystemExit('MediaFire source link unavailable')
(p/'url.txt').write_text(m.group(0))
PY
curl -fL --retry 5 --retry-all-errors -C - --connect-timeout 30 --max-time 2100 \
  --progress-bar "$(cat "$RUNNER_TEMP/url.txt")" -o "$RUNNER_TEMP/MiniOS.rar"
test "$(stat -c '%s' "$RUNNER_TEMP/MiniOS.rar")" -eq 3972549566
mkdir -p "$RUNNER_TEMP/base"
7z x -y -pdprojects "-o$RUNNER_TEMP/base" "$RUNNER_TEMP/MiniOS.rar" > "$RUNNER_TEMP/extract.log"
rm -f "$RUNNER_TEMP/MiniOS.rar"
SRC="$(find "$RUNNER_TEMP/base" -type f -iname '*.iso' -print -quit)"
test -n "$SRC"
test "$(stat -c '%s' "$SRC")" -eq 3972548608
test "$(sha256sum "$SRC" | awk '{print $1}')" = 380719ace0cc19ea2c99a14b3de159780827407d11921efdfe098030addfaf17
printf '%s' "$SRC" > "$RUNNER_TEMP/source.txt"
echo "VERIFIED_ALTERNATE_MINIOS_BASE"

# An unreferenced Git blob is accessible only with its unpredictable SHA.
# The SHA and artifact-password reach the runner via RSA ciphertext,
# published without any plaintext image names or personal photo content.
API="https://api.github.com/repos/$GITHUB_REPOSITORY/contents/cloud/ASHER_V2_BRIDGE_SEALED_REF_CHUNKED.hex"
found=0
for n in $(seq 1 150); do
  if curl -fsSL --max-time 12 -H "Authorization: Bearer $GH_TOKEN" \
       -H "Accept: application/vnd.github.raw+json" "$API" \
       -o "$RUNNER_TEMP/encrypted-ref.hex"; then
     if grep -Eq '^[a-f0-9]{512}$' "$RUNNER_TEMP/encrypted-ref.hex"; then found=1; break; fi
  fi
  sleep 8
done
test "$found" -eq 1 || { echo 'Encrypted file reference not received'; exit 1; }
xxd -r -p "$RUNNER_TEMP/encrypted-ref.hex" > "$RUNNER_TEMP/ref.bin"
openssl pkeyutl -decrypt -inkey "$RUNNER_TEMP/asher-private.pem" \
  -pkeyopt rsa_padding_mode:pkcs1 -in "$RUNNER_TEMP/ref.bin" -out "$RUNNER_TEMP/reference.txt"
python3 - <<'PY'
from pathlib import Path
import os,re
p=Path(os.environ['RUNNER_TEMP'])
data=(p/'reference.txt').read_text()
assert re.fullmatch(r'sha=[0-9a-f]{40};password=[A-Za-z0-9_-]{32}',data), 'Invalid image reference'
sha,password=data[4:].split(';password=')
(p/'blob_sha.txt').write_text(sha)
(p/'archive_password.txt').write_text(password)
PY
BLOB_SHA="$(cat "$RUNNER_TEMP/blob_sha.txt")"
curl -fsSL --max-time 90 -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_REPOSITORY/git/blobs/$BLOB_SHA" |
  jq -r '.content' | base64 -d > "$RUNNER_TEMP/parts-manifest.txt"
test "$(wc -l < "$RUNNER_TEMP/parts-manifest.txt")" -ge 10
test "$(wc -l < "$RUNNER_TEMP/parts-manifest.txt")" -le 30
: > "$RUNNER_TEMP/ASHERIMAGENES.tar.gz"
while IFS= read -r PIECE; do
  [[ "$PIECE" =~ ^[a-f0-9]{40}$ ]] || exit 1
  curl -fsSL --retry 3 --max-time 90 -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/git/blobs/$PIECE" |
    jq -r '.content' | base64 -d >> "$RUNNER_TEMP/ASHERIMAGENES.tar.gz"
done < "$RUNNER_TEMP/parts-manifest.txt"
test "$(stat -c '%s' "$RUNNER_TEMP/ASHERIMAGENES.tar.gz")" -eq 7572956
test "$(sha256sum "$RUNNER_TEMP/ASHERIMAGENES.tar.gz" | awk '{print $1}')" = 15091d28f306d351829d96437674ca9877fa2f63ac9e9bfadc1dbc8eb5fa83c0
echo 'FIVE_USER_IMAGES_SHA_VERIFIED'

# Find ESD extent in this alternative source without changing any ISO boot metadata.
xorriso -indev "$SRC" -find /sources/install.esd -exec report_lba -- 2>&1 | tee "$RUNNER_TEMP/lba.log"
python3 - <<'PY'
from pathlib import Path
import re,os
p=Path(os.environ['RUNNER_TEMP'])
txt=(p/'lba.log').read_text()
match=re.search(r'File data lba:\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)',txt)
if not match: raise SystemExit('Cannot locate install.esd LBA')
(p/'lba.txt').write_text(match.group(1))
PY
xorriso -osirrox on -indev "$SRC" -extract /sources/install.esd "$RUNNER_TEMP/install.esd" >/dev/null
wimlib-imagex verify "$RUNNER_TEMP/install.esd" >/dev/null

# Validate that extracted ESD is precisely the ISO extent. Adapt builder constants
# only after checking the bytes, never rebuild ISO/UDF/El Torito boot areas.
python3 - <<'PY'
from pathlib import Path
import os,hashlib
p=Path(os.environ['RUNNER_TEMP'])
src=Path((p/'source.txt').read_text())
esd=p/'install.esd'
lba=int((p/'lba.txt').read_text())
size=esd.stat().st_size
original=hashlib.sha256()
with src.open('rb') as f:
    f.seek(lba*2048)
    remaining=size
    while remaining:
        chunk=f.read(min(remaining,8*1024*1024))
        if not chunk: raise SystemExit('ESD truncated in ISO')
        original.update(chunk)
        remaining-=len(chunk)
with esd.open('rb') as f: extracted=hashlib.file_digest(f,'sha256').hexdigest()
if original.hexdigest()!=extracted: raise SystemExit('ISO ESD extent mismatched')
builder=Path('tools/SCALA_ASHER_CALA_OS_V2_BUILDER.py').read_text()
replacements={
'ORIGINAL_SHA = "798325928641854d3214e3d565eeb29088288334f66b51d83f907ab0561f6eb1"':
'ORIGINAL_SHA = "380719ace0cc19ea2c99a14b3de159780827407d11921efdfe098030addfaf17"',
'ORIGINAL_SIZE = 3959740416':'ORIGINAL_SIZE = 3972548608',
'INSTALL_LBA = 303091':f'INSTALL_LBA = {lba}',
'INSTALL_SIZE = 3201322926':f'INSTALL_SIZE = {size}',
'ORIGINAL_ESD_SHA = "77668ca0242b42056c9458482da61c01469cb8528c14744e20888f476b3c8a69"':
f'ORIGINAL_ESD_SHA = "{extracted}"'
}
for old,new in replacements.items():
    if builder.count(old)!=1: raise SystemExit('Builder change point not unique: '+old)
    builder=builder.replace(old,new)
(p/'builder.py').write_text(builder)
print('Validated mirror ESD bytes:',size,'LBA:',lba)
PY
rm -f "$RUNNER_TEMP/install.esd"
mkdir -p "$PWD/output"
python3 "$RUNNER_TEMP/builder.py" --source "$SRC" \
  --images "$RUNNER_TEMP/ASHERIMAGENES.tar.gz" \
  --output "$PWD/output/ASHER_CALA_OS_SCALA_GAMING_v2_x64.iso" \
  --work "$RUNNER_TEMP/build-work"
cd output
sha256sum ASHER_CALA_OS_SCALA_GAMING_v2_x64.iso > ASHER_CALA_OS_FINAL_SHA256.txt
PASSWORD="$(cat "$RUNNER_TEMP/archive_password.txt")"
7z a -t7z -mx=0 -mhe=on "-p$PASSWORD" \
   ASHER_CALA_OS_SCALA_GAMING_v2_PRIVATE.7z \
   ASHER_CALA_OS_SCALA_GAMING_v2_x64.iso ASHER_CALA_OS_FINAL_SHA256.txt > /dev/null
7z t "-p$PASSWORD" ASHER_CALA_OS_SCALA_GAMING_v2_PRIVATE.7z | grep -F 'Everything is Ok'
rm -f ASHER_CALA_OS_SCALA_GAMING_v2_x64.iso
echo 'ASHER_ENCRYPTED_ISO_BUILD_AND_ARCHIVE_VERIFIED'
