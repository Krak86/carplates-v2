# secrets/

Local-only certificates and private keys, one folder per domain or service. **Everything here except this README is git-ignored**
(`.gitignore`: `secrets/*`, plus `*.key`, `*.p12`, `*.pfx` anywhere). Never commit keys; back this folder up somewhere private (password manager, encrypted drive).

```
secrets/
  carsua.app/
    cloudflare-aop/   aop.pem (public, also GitHub secret CF_AOP_CERT) + aop.key (private, uploaded to Cloudflare Zone-level AOP)
    cloudflare-origin/ origin.pem + origin.key (Origin CA cert; GitHub secrets CF_ORIGIN_CERT / CF_ORIGIN_KEY)
```

Generate the AOP pair (Git Bash needs `MSYS_NO_PATHCONV=1` or it rewrites `/CN=`):

    MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes -keyout aop.key -out aop.pem -days 3650 \
      -subj "/CN=carsua-aop" -addext "extendedKeyUsage=clientAuth" -addext "keyUsage=digitalSignature"

`aop.pem` valid until 2036-11-14: renew before then (upload the new pair, update `CF_AOP_CERT`, redeploy).
Plan and rollout: `docs/origin-hardening-plan.md` (H2).
