const url = 'https://drive.google.com/uc?export=download&id=1j5aXNfD_4X_jNkxvC_c-1R_YtX5d1a_';
fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`)
  .then(r => console.log('Status:', r.status, r.headers.get('content-type')))
  .catch(e => console.error(e));
