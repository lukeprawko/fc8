(function () {
  "use strict";
  var cfg = {
    apiKey: "AIzaSyCtKxDIKJOWtfGZ2RXTSEHS37SIIRC92gM",
    authDomain: "nova-s-e94ea.firebaseapp.com",
    projectId: "nova-s-e94ea",
    storageBucket: "nova-s-e94ea.firebasestorage.app",
    messagingSenderId: "831762785334",
    appId: "1:831762785334:web:da4cc29c9ffbfb5a66a497",
    measurementId: "G-9WF1QJ1V67"
  };
  var auth = null, db = null, user = null, profile = null, unsub = null, timers = {}, pendingSaves = {};
  var box, nickInput, passInput, message, profileLabel, form, loginBtn, registerBtn, logoutBtn;

  function emailFor(nick) {
    var map = { "ą":"a", "ć":"c", "ę":"e", "ł":"l", "ń":"n", "ó":"o", "ś":"s", "ź":"z", "ż":"z" };
    var clean = String(nick || "").trim().toLowerCase();
    Object.keys(map).forEach(function (key) { clean = clean.split(key).join(map[key]); });
    clean = clean.replace(/[^a-z0-9_]/g, "_") || "gracz";
    return "u_" + clean + "@cyberpong.app";
  }

  function freshProfile(nick) {
    return {
      nick: String(nick || "GRACZ").trim().slice(0, 12) || "GRACZ",
      level: 1, exp: 0, sp: 1, spentSp: 0, freeResets: 1,
      talents: { root: true },
      stats: { matches: 0, wins: 0, goals: 0, wallRecord: 0 },
      resetVersion: 3, isAdmin: false, allTalents: false,
      infiniteStamina: false, godMode: false, goldSmash: false,
      customSpeedMult: 1, customSmashMult: 1, customPaddleHeight: null,
      adminBadge: null, adminToken: null, updatedAt: Date.now()
    };
  }

  function note(text, error) {
    if (!message) return;
    message.textContent = text;
    message.style.color = error ? "#fecaca" : "#86efac";
  }

  function emit() {
    document.dispatchEvent(new CustomEvent("nova-account-profile", {
      detail: { profile: profile, uid: user ? user.uid : null, gameKey: document.body.getAttribute("data-game-key") || "" }
    }));
  }

  function draw() {
    if (!box) return;
    var signed = !!user;
    form.style.display = signed ? "none" : "grid";
    profileLabel.style.display = signed ? "block" : "none";
    loginBtn.style.display = signed ? "none" : "inline-flex";
    registerBtn.style.display = signed ? "none" : "inline-flex";
    logoutBtn.style.display = signed ? "inline-flex" : "none";
    if (signed) {
      var n = profile && profile.nick ? String(profile.nick) : (user.displayName || "GRACZ");
      var lvl = profile && Number.isFinite(profile.level) ? Math.max(1, Math.floor(profile.level)) : 1;
      var xp = profile && Number.isFinite(profile.exp) ? Math.max(0, Math.floor(profile.exp)) : 0;
      profileLabel.textContent = "☁ " + n + " • LVL " + lvl + " • " + xp + " XP";
      var gameNick = document.getElementById("nickInput");
      if (gameNick) gameNick.value = n.slice(0, 12);
    }
  }

  function openLogin() {
    if (!user && form) {
      form.style.display = "grid";
      nickInput.focus();
    }
  }

  function bindUser(nextUser) {
    user = nextUser || null;
    profile = null;
    if (unsub) { unsub(); unsub = null; }
    draw();
    if (!user || !db) { emit(); return; }
    var activeUser = user;
    var ref = db.collection("players").doc(activeUser.uid);
    ref.get().then(function (snap) {
      if (!user || user.uid !== activeUser.uid) return;
      if (!snap.exists) return ref.set(freshProfile(activeUser.displayName || (nickInput && nickInput.value) || "GRACZ"));
    }).then(function () {
      if (!user || user.uid !== activeUser.uid) return;
      unsub = ref.onSnapshot(function (snap) {
        if (!snap.exists) return;
        profile = snap.data() || {};
        draw();
        emit();
      }, function () { note("Nie udało się pobrać profilu.", true); });
    }).catch(function (e) { note(e.message || "Błąd profilu.", true); });
  }
  function saveGameData(key, value) {
    if (!user || !db || (key !== "fc" && key !== "ducks")) return Promise.resolve(false);
    try {
      var data = JSON.parse(JSON.stringify(value));
      if (JSON.stringify(data).length > 50000) return Promise.resolve(false);
      var activeUid = user.uid;
      if (timers[key]) clearTimeout(timers[key]);
      if (pendingSaves[key]) pendingSaves[key](false);
      return new Promise(function (resolve) {
        pendingSaves[key] = resolve;
        timers[key] = setTimeout(function () {
          delete timers[key];
          delete pendingSaves[key];
          if (!user || user.uid !== activeUid) { resolve(false); return; }
          var update = {};
          update["gameData." + key] = data;
          update.updatedAt = Date.now();
          db.collection("players").doc(activeUid).update(update)
            .then(function () { resolve(true); })
            .catch(function (e) { note(e.message || "Nie zapisano postępu w chmurze.", true); resolve(false); });
        }, 450);
      });
    } catch (_) { return Promise.resolve(false); }
  }
  function init() {
    var input = document.getElementById("nickInput");
    var top = input && input.closest(".top-row");
    box = document.createElement("section");
    box.className = "nova-account-widget";
    box.innerHTML =
      '<strong class="nova-account-title">KONTO NOVA <span id="novaAccountProfile"></span></strong>' +
      '<div id="novaAccountForm" class="nova-account-form">' +
      '<input id="novaAccountNick" maxlength="12" autocomplete="username" placeholder="NICK DO LOGOWANIA">' +
      '<input id="novaAccountPass" type="password" autocomplete="current-password" placeholder="HASŁO (min. 6 znaków)"></div>' +
      '<div class="nova-account-actions"><button id="novaAccountLogin" type="button">ZALOGUJ</button>' +
      '<button id="novaAccountRegister" type="button">UTWÓRZ KONTO</button>' +
      '<button id="novaAccountLogout" type="button">WYLOGUJ</button></div>' +
      '<div id="novaAccountMessage" class="nova-account-message">Profil i zapis gry synchronizują się po zalogowaniu.</div>';
    var style = document.createElement("style");
    style.textContent =
      ".nova-account-widget{width:100%;box-sizing:border-box;margin:10px 0 14px;padding:12px 14px;border:1px solid #334155;border-radius:12px;background:rgba(12,18,32,.9);color:#e2e8f0;font:600 12px/1.4 Inter,Arial,sans-serif}" +
      ".nova-account-title{display:flex;justify-content:space-between;gap:8px;color:#fbbf24;letter-spacing:.06em;margin-bottom:8px}" +
      ".nova-account-title span{color:#86efac;letter-spacing:0;font-size:11px}" +
      ".nova-account-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
      ".nova-account-widget input{min-width:0;padding:9px;border:1px solid #475569;border-radius:7px;background:#0b1220;color:#fff;font:inherit}" +
      ".nova-account-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}" +
      ".nova-account-actions button{border:0;border-radius:7px;padding:8px 12px;background:#f59e0b;color:#111827;font-weight:800;cursor:pointer}" +
      ".nova-account-message{min-height:16px;margin-top:7px;color:#94a3b8;font-size:11px}" +
      "@media(max-width:600px){.nova-account-form{grid-template-columns:1fr}}";
    document.head.appendChild(style);
    if (top && top.parentNode) top.parentNode.insertBefore(box, top.nextSibling);
    else (document.getElementById("mainPanel") || document.body).prepend(box);

    nickInput = box.querySelector("#novaAccountNick");
    passInput = box.querySelector("#novaAccountPass");
    message = box.querySelector("#novaAccountMessage");
    profileLabel = box.querySelector("#novaAccountProfile");
    form = box.querySelector("#novaAccountForm");
    loginBtn = box.querySelector("#novaAccountLogin");
    registerBtn = box.querySelector("#novaAccountRegister");
    logoutBtn = box.querySelector("#novaAccountLogout");
    if (input && input.value.trim()) nickInput.value = input.value.trim().slice(0, 12);
    loginBtn.addEventListener("click", login);
    registerBtn.addEventListener("click", register);
    logoutBtn.addEventListener("click", function () { if (auth) auth.signOut().then(function () { note("Wylogowano.", false); }); });
    [nickInput, passInput].forEach(function (field) {
      field.addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
    });

    window.NovaAccounts = {
      isSignedIn: function () { return !!user; },
      getProfile: function () { return profile; },
      openLogin: openLogin,
      saveGameData: saveGameData
    };
    if (typeof firebase === "undefined" || !firebase.auth || !firebase.firestore) {
      note("Nie udało się wczytać Firebase.", true);
      return;
    }
    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
      auth = app.auth();
      db = app.firestore();
      auth.onAuthStateChanged(bindUser);
    } catch (e) { note(e.message || "Nie udało się uruchomić Firebase.", true); }
  }

  function login() {
    var nick = nickInput.value.trim(), pass = passInput.value;
    if (!nick || !pass) { note("Wpisz nick i hasło.", true); return; }
    auth.signInWithEmailAndPassword(emailFor(nick), pass).then(function () {
      passInput.value = "";
      note("Zalogowano. Pobieram profil…", false);
    }).catch(function (e) {
      note(e.code === "auth/invalid-credential" ? "Niepoprawny nick lub hasło." : (e.message || "Błąd logowania."), true);
    });
  }

  function register() {
    var nick = nickInput.value.trim(), pass = passInput.value;
    if (nick.length < 3 || nick.length > 12) { note("Nick musi mieć od 3 do 12 znaków.", true); return; }
    if (pass.length < 6) { note("Hasło musi mieć co najmniej 6 znaków.", true); return; }
    auth.createUserWithEmailAndPassword(emailFor(nick), pass).then(function (credential) {
      return credential.user.updateProfile({ displayName: nick }).then(function () {
        return db.collection("players").doc(credential.user.uid).set(freshProfile(nick));
      });
    }).then(function () {
      passInput.value = "";
      note("Konto utworzone i zapisane w chmurze.", false);
    }).catch(function (e) {
      note(e.code === "auth/email-already-in-use" ? "Ten nick jest już zajęty. Zaloguj się." : (e.message || "Błąd rejestracji."), true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();