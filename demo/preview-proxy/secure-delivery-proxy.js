import http from 'node:http';

const PORT = 3000;

http
  .createServer((request, response) => {
    if (request.method !== 'GET') {
      return response.end('Only GET requests are supported');
    }
    const url = new URL(request.url, `http://localhost:${PORT}`);
    const path = url.pathname.replace(/([^\/])$/, '$1/');
    if (path !== '/preview/') {
      return response.end('Only `/preview/` path is supported');
    }
    const searchParams = url.searchParams;
    const fileUrl = searchParams.get('url');
    const size = searchParams.get('size');
    console.log(`Got request. Url: "${fileUrl}". Size: "${size}"`);
    if (!fileUrl) {
      return response.end('`url` parameter is required');
    }
    response.statusCode = 302;
    response.setHeader('Location', fileUrl); //lgtm [js/server-side-unvalidated-url-redirection];
    response.end();
  })
  .listen(PORT);
