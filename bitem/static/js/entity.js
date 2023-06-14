async function updateEnts() {
  const response = await fetch("/update");
  const message = await response.text();
  console.log(message);
}

updateEnts()