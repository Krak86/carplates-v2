/**
 * IndexNow ownership key (https://www.indexnow.org/documentation). Public by design: the protocol requires it at
 * `/<key>.txt` on the site. `deploy-api.yml` reads it from this file to ping the engines after a deploy.
 */
export const INDEXNOW_KEY = '499a210675c8b667b6796978f9a95600'
