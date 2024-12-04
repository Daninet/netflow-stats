export const wrapIntoHtml = (body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/css/flag-icons.min.css"
    />
    <link rel="stylesheet" href="/public/styles.css">
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>`;
