# secrets/

Local-only certificates and private keys, one folder per domain or service. **Everything here except this README is git-ignored**
(`.gitignore`: `secrets/*`, plus `*.key`, `*.p12`, `*.pfx` anywhere). Never commit keys; back this folder up somewhere private (password manager, encrypted drive).

```
secrets/
  carsua.app/
    cloudflare-aop/   ca.pem (public CA, also GitHub secret CF_AOP_CERT), ca.key (CA private key, keep for renewal),
                      leaf.pem + aop-bundle.pem (leaf + CA, upload to Cloudflare), aop.key (leaf private key, upload to Cloudflare)
    cloudflare-origin/ origin.pem + origin.key (Origin CA cert; GitHub secrets CF_ORIGIN_CERT / CF_ORIGIN_KEY)
```

Generate the AOP pair (Git Bash: `MSYS_NO_PATHCONV=1` stops it rewriting `/CN=`). Cloudflare rejects a self-signed `CA:TRUE` cert ("Missing leaf certificate"),
so make a CA and a leaf it signs:

    cd secrets/carsua.app/cloudflare-aop && export MSYS_NO_PATHCONV=1
    openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem -days 3650 -subj "/CN=carsua-aop-ca" \
      -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
    openssl req -newkey rsa:2048 -nodes -keyout aop.key -out aop.csr -subj "/CN=carsua-aop"
    printf "basicConstraints=CA:FALSE\nkeyUsage=digitalSignature\nextendedKeyUsage=clientAuth\n" > leaf.ext
    openssl x509 -req -in aop.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out leaf.pem -days 3650 -extfile leaf.ext
    cat leaf.pem ca.pem > aop-bundle.pem
    openssl verify -CAfile ca.pem leaf.pem

Cloudflare Zone-level upload: certificate = `aop-bundle.pem`, key = `aop.key`. GitHub secret `CF_AOP_CERT` = `ca.pem` (Caddy's trust pool).
Valid until 2036-11-14: renew before then (new leaf from the same CA, upload, redeploy).
Plan and rollout: `docs/origin-hardening-plan.md` (H2).
