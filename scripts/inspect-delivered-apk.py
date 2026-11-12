# Exact delivered 0.7 APK inspection; not a general-purpose Android verifier.
# Requires external free cryptography and the locked Hermes compiler dump.
import struct,zipfile,hashlib,json,re,base64,sys
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
if len(sys.argv)!=3: raise SystemExit('Use: python inspect-delivered-apk.py EXACT_APK HERMES_DUMP')
P=Path(sys.argv[1]); b=P.read_bytes()
assert hashlib.sha256(b).hexdigest()=='715a5c7039069f21214f9eaea74adfb7dd385470c6f9f5c2a163c1e2cb405031', 'Different build; stop and establish its own identity.'
dump=Path(sys.argv[2]).read_text()
assert 'Bytecode version number: 99' in dump
string_lines=[l.split(': ',1)[1] for l in dump.splitlines() if re.match(r's\d+\[',l) and ': ' in l]
assert 'sb_publishable_' in string_lines
assert not any(re.search(r'sb_(?:publishable|secret)_[A-Za-z0-9_-]{20,}',s) for s in string_lines)
assert not any(re.search(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',s) for s in string_lines)
u32=lambda x,o=0:struct.unpack_from('<I',x,o)[0]
u64=lambda x,o=0:struct.unpack_from('<Q',x,o)[0]
def lp(x,o=0):
 n=u32(x,o);assert o+4+n<=len(x);return x[o+4:o+4+n],o+4+n
def seq(x):
 o=0
 while o<len(x):v,o=lp(x,o);yield v
 assert o==len(x)
eocd=b.rfind(b'PK\x05\x06');assert eocd>=0 and eocd+22+struct.unpack_from('<H',b,eocd+20)[0]==len(b)
cd=u32(b,eocd+16);assert b[cd-16:cd]==b'APK Sig Block 42';size=u64(b,cd-24);start=cd-size-8;assert u64(b,start)==size
pos=start+8;v2=None
while pos<cd-24:
 n=u64(b,pos);ident=u32(b,pos+8)
 if ident==0x7109871a:v2=b[pos+12:pos+8+n]
 pos+=8+n
assert pos==cd-24 and v2
signers,_=lp(v2);certs=[]
for signer in seq(signers):
 signed,o=lp(signer);sigs,o=lp(signer,o);pub,o=lp(signer,o);assert o==len(signer)
 digests,p=lp(signed);chain,p=lp(signed,p);attrs,p=lp(signed,p);assert signed[p:] in (b"", b"\x00"*4)
 cert=next(seq(chain));cert=x509.load_der_x509_certificate(cert)
 assert cert.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)==pub
 # The delivered APK uses deterministic RSA/SHA-256. Fail closed for other schemes.
 sigmap={u32(s):lp(s,4)[0] for s in seq(sigs)};digmap={u32(d):lp(d,4)[0] for d in seq(digests)}
 assert list(sigmap)==list(digmap) and 0x0103 in sigmap
 cert.public_key().verify(sigmap[0x0103],signed,padding.PKCS1v15(),hashes.SHA256())
 tail=bytearray(b[eocd:]);struct.pack_into('<I',tail,16,start);chunks=[]
 for part in (b[:start],b[cd:eocd],tail):
  for k in range(0,len(part),1024*1024):
   c=part[k:k+1024*1024];chunks.append(hashlib.sha256(b'\xa5'+struct.pack('<I',len(c))+c).digest())
 assert hashlib.sha256(b'\x5a'+struct.pack('<I',len(chunks))+b''.join(chunks)).digest()==digmap[0x0103]
 certs.append(cert.fingerprint(hashes.SHA256()).hex())
# Decode the binary manifest's string pool and typed start-element attributes.
def length(x,p,wide):
 if wide:
  n=struct.unpack_from('<H',x,p)[0];p+=2
  if n&0x8000:n=((n&0x7fff)<<16)|struct.unpack_from('<H',x,p)[0];p+=2
 else:
  n=x[p];p+=1
  if n&128:n=((n&127)<<8)|x[p];p+=1
 return n,p
with zipfile.ZipFile(P) as z:
 assert z.testzip() is None
 xml=z.read('AndroidManifest.xml');strings=[];manifest={};off=8
 while off<len(xml):
  typ,hs,total=struct.unpack_from('<HHI',xml,off);assert total>=hs and total>0
  x=xml[off:off+total]
  if typ==1:
   count=u32(x,8);flags=u32(x,16);sp=u32(x,20);utf8=bool(flags&256)
   for i in range(count):
    p=sp+u32(x,hs+4*i)
    n,p=length(x,p,not utf8)
    if utf8:n,p=length(x,p,False)
    strings.append(x[p:p+n*(1 if utf8 else 2)].decode('utf-8' if utf8 else 'utf-16le'))
  if typ==0x102:
   tag=strings[u32(x,20)];aoff,asz,count=struct.unpack_from('<HHH',x,24);vals={}
   for i in range(count):
    p=16+aoff+i*asz;name=strings[u32(x,p+4)];raw=u32(x,p+8);kind=x[p+15];value=u32(x,p+16)
    vals[name]=strings[raw] if raw!=0xffffffff else strings[value] if kind==3 else value
   if tag in ['manifest','uses-sdk','application']:manifest[tag]=vals
  off+=total
 names=z.namelist();assert not any(re.search(r'(?:^|/)(?:\.env(?:\..*)?|[^/]+\.(?:jks|keystore|p12))$',n,re.I) for n in names);lib=z.read('lib/arm64-v8a/libexpo-sqlite.so');js=z.read('assets/index.android.bundle')
 findings=[];jwtroles=[];config=[]
 pats={'secret_api_key':rb'sb_secret_[A-Za-z0-9_-]{20,}','aws_access_key':rb'(?:AKIA|ASIA)[A-Z0-9]{16}','private_key_material':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\nA-Za-z0-9+/=]{100,}','google_api_key':rb'AIza[0-9A-Za-z_-]{35}'}
 for name in names:
  if name.endswith('/'):continue
  data=z.read(name)
  for label,pat in pats.items():
   matches=list(re.finditer(pat,data))
   if matches:findings.append({'entry':name,'kind':label,'count':len(matches)})
  for t in re.findall(rb'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',data):
   try:
    payload=json.loads(base64.urlsafe_b64decode(t.split(b'.')[1]+b'==='));role=payload.get('role','unknown')
    jwtroles.append({'entry':name,'role':role})
   except Exception:pass
 for pattern in [rb'https://[a-z0-9-]+\.supabase\.co',rb'http://(?:127\.0\.0\.1|10\.0\.2\.2):54321',rb'sb_publishable_[A-Za-z0-9_-]{20,}',rb'replace-with-local-anon-or-publishable-key']:
  config.extend(m.decode() for m in re.findall(pattern,js))
 report={'date':'2026-10-23','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'certificateSha256':certs,'apkV2SignatureAndContentDigest':'verified independently with cryptography RSA-SHA256 and AOSP chunked digest','manifest':manifest,'abis':sorted(set(n.split('/')[1] for n in names if n.startswith('lib/') and n.endswith('.so'))),'embeddedBundle':{'present':True,'bytes':len(js),'sha256':hashlib.sha256(js).hexdigest()},'cipherNativeLibrary':{'present':True,'sha256':hashlib.sha256(lib).hexdigest(),'markers':{s.decode():s in lib for s in [b'sqlite3_key',b'sqlcipher',b'cipher_version']}},'credentialPatternFindings':findings,'embeddedJWTs':jwtroles,'backendLiteralConfiguration':['http://127.0.0.1:54321 (public connection-screen hint/default input; not a configured authenticated backend)'],'hermesStringInspection':{'version':99,'decoder':'locked hermes-compiler -dump-bytecode','configuredPublicKeyFound':False,'prefixOnly':'sb_publishable_ is a validator prefix, not a configured key; raw packed string storage can concatenate neighbours'},'sourceConfigurationReview':'saved encrypted public settings or EXPO_PUBLIC URL/key; no key baked into delivered HBC strings','secretScanLimit':'Pattern/static inspection cannot prove absence of all secrets or verify runtime storage. No raw candidate credentials are logged.','installed':False,'executed':False}
 print(json.dumps(report,indent=2))
 assert report['sha256']=='715a5c7039069f21214f9eaea74adfb7dd385470c6f9f5c2a163c1e2cb405031'
 assert certs==['fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c']
 assert not findings and not jwtroles
