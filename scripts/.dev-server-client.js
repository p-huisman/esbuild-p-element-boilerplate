var ws = new WebSocket(`ws://${location.hostname}${location.port ? ":" + location.port : ""}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
  if (data.warnings && data.warnings.length > 0) {
    console.warn(data.warnings);
  }
  if (data.errors && data.errors.length > 0) {
    console.error(data.errors);
  } else {
    location.reload();
  }
};