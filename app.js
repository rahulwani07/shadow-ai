let recognition;
let lang = "en-US";
let synth = window.speechSynthesis;
let hasGreeted = false;

window.onload = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;

  updateTime();
  getBatteryStatus();
  getWeather();
  setInterval(updateTime, 60000);

  recognition.onstart = () => {
    if (!hasGreeted) {
      speak("Hello, I am Shadow. How can I assist you?");
      hasGreeted = true;
    }
  };

  recognition.onend = () => recognition.start();

  recognition.onresult = function (event) {
    let transcript = event.results[event.resultIndex][0].transcript.toLowerCase();
    console.log("Heard:", transcript);

    if (transcript.includes("hello")) speak("Hello! How can I help?");
    else if (transcript.includes("what is the time")) speak(new Date().toLocaleTimeString());
    else if (transcript.includes("battery status")) speakBattery();
    else if (transcript.includes("weather report")) speakWeather();
    else if (transcript.includes("turn on torch")) enableTorch(true);
    else if (transcript.includes("turn off torch")) enableTorch(false);
    else if (transcript.includes("open camera") || transcript.includes("take selfie")) openCamera();
    else if (transcript.includes("turn off camera")) closeCamera();
    else if (transcript.includes("send my location to")) {
      let name = transcript.split("send my location to")[1].trim();
      let number = getNumber(name);
      if (number) sendLocationTo(number, name);
      else speak("Contact not found");
    } else speak("How can I assist you?");
  };

  recognition.start();
};

// Support Functions

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  synth.speak(utter);
}

function updateTime() {
  document.getElementById("time").innerText = new Date().toLocaleTimeString();
}

function getBatteryStatus() {
  navigator.getBattery().then(battery => {
    const update = () => {
      let percent = Math.round(battery.level * 100);
      let status = battery.charging ? "Charging" : "Not Charging";
      document.getElementById("battery").innerText = `${percent}% (${status})`;
    };
    update();
    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
  });
}

function speakBattery() {
  navigator.getBattery().then(battery => {
    let percent = Math.round(battery.level * 100);
    let status = battery.charging ? "charging" : "not charging";
    speak(`Battery is ${percent} percent and ${status}`);
  });
}

function getWeather() {
  fetch("https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid=48ddfe8c9cf29f95b7d0e54d6e171008")
    .then(res => res.json())
    .then(data => {
      const temp = (data.main.feels_like - 273.15).toFixed(1);
      const desc = data.weather[0].description;
      const result = `${desc}, feels like ${temp}°C`;
      document.getElementById("weather").innerText = result;
      window.weatherData = result;
    })
    .catch(() => {
      document.getElementById("weather").innerText = "Unavailable";
    });
}

function speakWeather() {
  if (window.weatherData) speak("Current weather is " + window.weatherData);
  else speak("Weather info not available");
}

let torchStream = null;
async function enableTorch(enable) {
  try {
    if (enable) {
      torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      speak("Torch turned on");
    } else if (torchStream) {
      torchStream.getTracks().forEach(track => track.stop());
      speak("Torch turned off");
    }
  } catch {
    speak("Torch not supported");
  }
}

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      speak("Opening camera");
      let video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.style = "position:fixed;top:10px;right:10px;width:150px;z-index:9999;";
      video.id = "shadowCam";
      document.body.appendChild(video);
    })
    .catch(() => speak("Camera access denied"));
}

function closeCamera() {
  let video = document.getElementById("shadowCam");
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.remove();
    speak("Camera turned off");
  } else {
    speak("Camera is not active");
  }
}

function sendLocationTo(number, name) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      let lat = pos.coords.latitude;
      let lon = pos.coords.longitude;
      let map = `https://www.google.com/maps?q=${lat},${lon}`;
      let msg = `Hey ${name}, here's my location: ${map}`;
      speak(`Sending location to ${name}`);
      window.location.href = `sms:${number}?body=${encodeURIComponent(msg)}`;
    },
    () => speak("Unable to access your location")
  );
}

function getSavedContacts() {
  return JSON.parse(localStorage.getItem("contacts") || "{}");
}

function getNumber(name) {
  const contacts = getSavedContacts();
  return contacts[name.toLowerCase()] || null;
}

function addContact() {
  const name = document.getElementById("newName").value.toLowerCase();
  const number = document.getElementById("newNumber").value;
  if (name && number) {
    let contacts = getSavedContacts();
    contacts[name] = number;
    localStorage.setItem("contacts", JSON.stringify(contacts));
    speak(`Saved contact ${name}`);
  } else speak("Enter valid name and number");
}
