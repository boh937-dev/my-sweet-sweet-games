const questions = [
  {
    question: "What tempeture does chocolate need to harden ?",
    answers: ["none of the above ", "34 degreas ", "room tepeture ", "-34 celceus "],
    correctAnswer: "room tepeture",
  },
  {
    question: "How many seeds are in a coco pod ?",
    answers: ["15 - 20", "30 - 40 ", "60 - 70", " 32 - 54"],
    correctAnswer: "30 - 40 ",
  },
  {
    question: "otis favroit chocolate?",
    answers: ["strawberry", "matcha", "milk", "mint"],
    correctAnswer: "strawberry"
  },
  {
    question: "bemis favriot chcolate ?",
    answers: ["mint", "100% dark", "milk", "cookies and cream"],
    correctAnswer: "100% dark",
  },
  {
    question: "homis favriot chocolate ?",
    answers: ["cookies and cream", " milk hazelnut", "strawberry", "milk coconut"],
    correctAnswer: "cookies and cream",
  },
  {
    question: "what fruit does chocolate come from ?",
    answers: ["lyich", "cocpods", "apple", "cocobeans "],
    correctAnswer: "cocpods",
  },
  {
    question: "what 1 countres produce the most coco?",
    answers: ["swedzerland ", "canada", "japan", "ghana"],
    correctAnswer: "ghana",
  },
  {
    question: "what is cocobutter ",
    answers: ["sugar water", "the natural fat in coco beans", "butter mixed with coco powder ", "the natural fat in coco pods"],
    correctAnswer: "the natural fat in coco beans",
  },
  {
    question: "What are coco nibs?",
    answers: ["coco butter hardend ", "rosted crushed coco beans", "crushed coco beans", "crystals "],
    correctAnswer: "rosted crushed coco beans",
  },
  {
    question: "why is fermentation essential",
    answers: ["to cool the chocolate beans", "it develops flavor  ", "to  drie beans", "to make the chocolate smell good "],
    correctAnswer: "it develops flavor",
  },
  {
    question: " null ",
    answers: [ null ],
    correctAnswer: " null",
  },
    {
    question: " null ",
    answers: [ null ],
    correctAnswer: " null",
  },
    {
    question: " null ",
    answers: [ null ],
    correctAnswer: " null",
  },
    {
    question: " null ",
    answers: [ null ],
    correctAnswer: " null",
  },
    {
    question: " null ",
    answers: [ null ],
    correctAnswer: " null",
  },

];

let currentQuestionIndex = 0;
let score = 0;
let waitingForNextQuestion = false;
let timeLeft = 5;
let timerInterval;
let nextQuestionTimeout;
let currentEmail = sessionStorage.getItem("triviaCurrentEmail") || "";
let currentPlayer = null;
let lobbyHeartbeatInterval;

const LOBBY_PLAYERS_KEY = "triviaLobbyPlayers";
const GAME_STARTED_KEY = "triviaGameStarted";
const PLAYER_SCORES_KEY = "triviaPlayerScores";
const GAME_RESET_KEY = "triviaGameReset";
const CURRENT_PLAYER_KEY = "triviaCurrentPlayer";
const CURRENT_PLAYER_ID_KEY = "triviaCurrentPlayerId";
const LOBBY_HEARTBEAT_MS = 3000;
const STALE_PLAYER_MS = 12000;

const loginScreen = document.querySelector("#loginScreen");
const lobbyScreen = document.querySelector("#lobbyScreen");
const hostScreen = document.querySelector("#hostScreen");
const gameScreen = document.querySelector("#gameScreen");
const emailForm = document.querySelector("#emailForm");
const firstNameInput = document.querySelector("#firstNameInput");
const lastNameInput = document.querySelector("#lastNameInput");
const emailInput = document.querySelector("#emailInput");
const loginMessage = document.querySelector("#loginMessage");
const playerList = document.querySelector("#playerList");
const hostText = document.querySelector("#hostText");
const lobbyMessage = document.querySelector("#lobbyMessage");
const startGameButton = document.querySelector("#startGameButton");
const lobbyResetGameButton = document.querySelector("#lobbyResetGameButton");
const finishedText = document.querySelector("#finishedText");
const hostMessage = document.querySelector("#hostMessage");
const scoreList = document.querySelector("#scoreList");
const resetLobbyButton = document.querySelector("#resetLobbyButton");
const resetGameButton = document.querySelector("#resetGameButton");
const roundText = document.querySelector("#roundText");
const timeText = document.querySelector("#timeText");
const scoreText = document.querySelector("#scoreText");
const questionText = document.querySelector("#questionText");
const messageText = document.querySelector("#messageText");
const answerButtons = document.querySelectorAll(".answer-button");
const restartButton = document.querySelector("#restartButton");

function showScreen(screen) {
  loginScreen.hidden = screen !== loginScreen;
  lobbyScreen.hidden = screen !== lobbyScreen;
  hostScreen.hidden = screen !== hostScreen;
  gameScreen.hidden = screen !== gameScreen;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePlayer(player) {
  if (typeof player === "string") {
    return {
      firstName: "",
      lastName: "",
      email: normalizeText(player),
      id: "",
      lastSeen: 0,
    };
  }

  return {
    firstName: normalizeText(player.firstName),
    lastName: normalizeText(player.lastName),
    email: normalizeText(player.email),
    id: normalizeText(player.id),
    lastSeen: Number(player.lastSeen) || 0,
  };
}

function getPlayerKey(player) {
  const normalizedPlayer = normalizePlayer(player);
  return [
    normalizedPlayer.email.toLowerCase(),
    normalizedPlayer.firstName.toLowerCase(),
    normalizedPlayer.lastName.toLowerCase(),
  ].join("|");
}

function getPlayerDisplayName(player) {
  const normalizedPlayer = normalizePlayer(player);
  const fullName = `${normalizedPlayer.firstName} ${normalizedPlayer.lastName}`.trim();

  if (!fullName) {
    return normalizedPlayer.email;
  }

  return `${fullName} (${normalizedPlayer.email})`;
}

function isSamePlayer(firstPlayer, secondPlayer) {
  return getPlayerKey(firstPlayer) === getPlayerKey(secondPlayer);
}

function getCurrentPlayerId() {
  let playerId = sessionStorage.getItem(CURRENT_PLAYER_ID_KEY);

  if (!playerId) {
    playerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(CURRENT_PLAYER_ID_KEY, playerId);
  }

  return playerId;
}

function isSamePlayerSession(firstPlayer, secondPlayer) {
  return firstPlayer.id && secondPlayer.id && firstPlayer.id === secondPlayer.id;
}

function hasScoreForPlayer(scores, player) {
  const normalizedPlayer = normalizePlayer(player);
  return (
    Object.prototype.hasOwnProperty.call(scores, getPlayerKey(normalizedPlayer)) ||
    Object.prototype.hasOwnProperty.call(scores, normalizedPlayer.email)
  );
}

function getScoreForPlayer(scores, player) {
  const normalizedPlayer = normalizePlayer(player);
  const playerKey = getPlayerKey(normalizedPlayer);

  if (Object.prototype.hasOwnProperty.call(scores, playerKey)) {
    return scores[playerKey];
  }

  return scores[normalizedPlayer.email];
}

function getSavedCurrentPlayer() {
  const savedPlayer = sessionStorage.getItem(CURRENT_PLAYER_KEY);

  if (savedPlayer) {
    try {
      return normalizePlayer(JSON.parse(savedPlayer));
    } catch {
      sessionStorage.removeItem(CURRENT_PLAYER_KEY);
    }
  }

  if (currentEmail) {
    return normalizePlayer(currentEmail);
  }

  return null;
}

function saveCurrentPlayer(player) {
  currentPlayer = normalizePlayer(player);
  currentPlayer.id = currentPlayer.id || getCurrentPlayerId();
  currentPlayer.lastSeen = Date.now();
  currentEmail = currentPlayer.email;
  sessionStorage.setItem(CURRENT_PLAYER_KEY, JSON.stringify(currentPlayer));
  sessionStorage.setItem("triviaCurrentEmail", currentEmail);
}

function getPlayers() {
  const savedPlayers = localStorage.getItem(LOBBY_PLAYERS_KEY);

  if (!savedPlayers) {
    return [];
  }

  try {
    return JSON.parse(savedPlayers)
      .map(normalizePlayer)
      .filter((player) => player.email);
  } catch {
    return [];
  }
}

function savePlayers(players) {
  localStorage.setItem(LOBBY_PLAYERS_KEY, JSON.stringify(players));
}

function pruneInactivePlayers() {
  const now = Date.now();
  const players = getPlayers();
  const activePlayers = players.filter((player) => {
    if (currentPlayer && isSamePlayerSession(player, currentPlayer)) {
      return true;
    }

    return player.lastSeen && now - player.lastSeen <= STALE_PLAYER_MS;
  });

  if (activePlayers.length !== players.length) {
    savePlayers(activePlayers);
  }

  if (activePlayers.length === 0) {
    saveScores({});
    localStorage.setItem(GAME_STARTED_KEY, "false");
  }

  return activePlayers;
}

function markCurrentPlayerActive() {
  if (!currentPlayer) {
    return;
  }

  const now = Date.now();
  const players = getPlayers();
  const playerIndex = players.findIndex((player) => {
    return isSamePlayerSession(player, currentPlayer) || isSamePlayer(player, currentPlayer);
  });

  currentPlayer.lastSeen = now;

  if (playerIndex >= 0) {
    players[playerIndex] = {
      ...players[playerIndex],
      ...currentPlayer,
      lastSeen: now,
    };
    savePlayers(players);
  }

  sessionStorage.setItem(CURRENT_PLAYER_KEY, JSON.stringify(currentPlayer));
}

function startLobbyHeartbeat() {
  clearInterval(lobbyHeartbeatInterval);
  markCurrentPlayerActive();
  lobbyHeartbeatInterval = setInterval(() => {
    markCurrentPlayerActive();
    pruneInactivePlayers();

    if (!lobbyScreen.hidden) {
      renderLobby();
    }

    if (!hostScreen.hidden) {
      renderScores();
    }
  }, LOBBY_HEARTBEAT_MS);
}

function stopLobbyHeartbeat() {
  clearInterval(lobbyHeartbeatInterval);
}

function removeCurrentPlayerFromLobby() {
  if (!currentPlayer) {
    return;
  }

  const players = getPlayers().filter((player) => {
    return !isSamePlayerSession(player, currentPlayer);
  });

  savePlayers(players);
}

function getScores() {
  const savedScores = localStorage.getItem(PLAYER_SCORES_KEY);

  if (!savedScores) {
    return {};
  }

  try {
    return JSON.parse(savedScores);
  } catch {
    return {};
  }
}

function saveScores(scores) {
  localStorage.setItem(PLAYER_SCORES_KEY, JSON.stringify(scores));
}

function clearLocalPlayer() {
  removeCurrentPlayerFromLobby();
  currentEmail = "";
  currentPlayer = null;
  stopLobbyHeartbeat();
  sessionStorage.removeItem(CURRENT_PLAYER_KEY);
  sessionStorage.removeItem("triviaCurrentEmail");
  firstNameInput.value = "";
  lastNameInput.value = "";
  emailInput.value = "";
  loginMessage.textContent = "";
  stopTimer();
  clearTimeout(nextQuestionTimeout);
  showScreen(loginScreen);
}

function isGameStarted() {
  return localStorage.getItem(GAME_STARTED_KEY) === "true";
}

function addPlayer(player) {
  const players = pruneInactivePlayers();
  const normalizedPlayer = {
    ...normalizePlayer(player),
    id: getCurrentPlayerId(),
    lastSeen: Date.now(),
  };
  const alreadyJoined = players.some((savedPlayer) => {
    return isSamePlayer(savedPlayer, normalizedPlayer) && !isSamePlayerSession(savedPlayer, normalizedPlayer);
  });
  const currentPlayerIndex = players.findIndex((savedPlayer) => {
    return isSamePlayerSession(savedPlayer, normalizedPlayer);
  });

  if (alreadyJoined) {
    return false;
  }

  if (currentPlayerIndex >= 0) {
    players[currentPlayerIndex] = normalizedPlayer;
  } else {
    players.push(normalizedPlayer);
  }

  savePlayers(players);
  return true;
}

function getTriviaPlayers() {
  return pruneInactivePlayers().slice(1);
}

function isHost() {
  const players = pruneInactivePlayers();
  return currentPlayer && players[0] && isSamePlayer(players[0], currentPlayer);
}

function isCurrentPlayerInLobby() {
  if (!currentPlayer) {
    return false;
  }

  return pruneInactivePlayers().some((player) => {
    return isSamePlayer(player, currentPlayer);
  });
}

function renderLobby() {
  const players = pruneInactivePlayers();

  playerList.innerHTML = "";
  players.forEach((player, index) => {
    const playerItem = document.createElement("li");
    playerItem.textContent = getPlayerDisplayName(player);

    if (index === 0) {
      const hostBadge = document.createElement("span");
      hostBadge.className = "host-badge";
      hostBadge.textContent = "Host";
      playerItem.append(hostBadge);
    }

    playerList.append(playerItem);
  });

  if (players.length === 0) {
    hostText.textContent = "No host";
    lobbyMessage.textContent = "No one is in the lobby yet.";
    startGameButton.disabled = true;
    lobbyResetGameButton.hidden = true;
    return;
  }

  if (isHost()) {
    hostText.textContent = "You are host";
    lobbyMessage.textContent = "Press Start Game when everyone is ready.";
    startGameButton.disabled = false;
    lobbyResetGameButton.hidden = false;
  } else {
    const hostName = players[0] ? getPlayerDisplayName(players[0]) : "host";
    hostText.textContent = `Host: ${hostName}`;
    lobbyMessage.textContent = "Waiting for the host to start.";
    startGameButton.disabled = true;
    lobbyResetGameButton.hidden = true;
  }
}

function joinLobby(player) {
  const normalizedPlayer = normalizePlayer(player);
  const joined = addPlayer(normalizedPlayer);

  if (!joined) {
    loginMessage.textContent = "That first name, last name, and email are already in the lobby.";
    return;
  }

  saveCurrentPlayer(normalizedPlayer);
  startLobbyHeartbeat();
  loginMessage.textContent = "";
  renderLobby();

  if (isGameStarted()) {
    if (isHost()) {
      showHostScreen();
    } else {
      startGame();
    }
  } else {
    showScreen(lobbyScreen);
  }
}

function stopTimer() {
  clearInterval(timerInterval);
}

function startTimer() {
  stopTimer();
  timeLeft = 5;
  timeText.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timeText.textContent = timeLeft;

    if (timeLeft === 0) {
      timeUp();
    }
  }, 1000);
}

function showQuestion() {
  const currentQuestion = questions[currentQuestionIndex];

  clearTimeout(nextQuestionTimeout);
  roundText.textContent = `Round ${currentQuestionIndex + 1} of ${questions.length}`;
  scoreText.textContent = score;
  questionText.textContent = currentQuestion.question;
  messageText.textContent = "";
  waitingForNextQuestion = false;

  answerButtons.forEach((button, index) => {
    button.textContent = currentQuestion.answers[index];
    button.disabled = false;
    button.classList.remove("correct", "wrong");
  });

  startTimer();
}

function finishGame() {
  stopTimer();
  timeText.textContent = "0";
  submitScore();
  questionText.textContent = `Game over! You scored ${score} points.`;
  roundText.textContent = "Finished";
  messageText.textContent = "Your score was sent to the host.";
  restartButton.hidden = true;

  answerButtons.forEach((button) => {
    button.disabled = true;
    button.classList.remove("correct", "wrong");
    button.textContent = "-";
  });
}

function goToNextQuestion() {
  currentQuestionIndex += 1;

  if (currentQuestionIndex >= questions.length) {
    finishGame();
    return;
  }

  showQuestion();
}

function showCorrectAnswer() {
  const currentQuestion = questions[currentQuestionIndex];

  answerButtons.forEach((answerButton) => {
    answerButton.disabled = true;

    if (answerButton.textContent.trim() === currentQuestion.correctAnswer.trim()) {
      answerButton.classList.add("correct");
    }
  });
}

function timeUp() {
  if (waitingForNextQuestion) {
    return;
  }

  waitingForNextQuestion = true;
  stopTimer();
  showCorrectAnswer();
  messageText.textContent = "Time is up!";
  nextQuestionTimeout = setTimeout(goToNextQuestion, 1500);
}

function chooseAnswer(event) {
  if (waitingForNextQuestion) {
    return;
  }

  waitingForNextQuestion = true;
  stopTimer();
  const button = event.currentTarget;
  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = button.textContent.trim() === currentQuestion.correctAnswer.trim();

  showCorrectAnswer();

  if (isCorrect) {
    score += timeLeft;
    scoreText.textContent = score;
    messageText.textContent = `Correct! +${timeLeft} points.`;
  } else {
    button.classList.add("wrong");
    messageText.textContent = `Wrong! The answer was ${currentQuestion.correctAnswer}.`;
  }

  nextQuestionTimeout = setTimeout(goToNextQuestion, 1500);
}

function restartGame() {
  clearTimeout(nextQuestionTimeout);
  stopTimer();
  currentQuestionIndex = 0;
  score = 0;
  restartButton.hidden = true;
  showQuestion();
}

function submitScore() {
  const scores = getScores();
  scores[getPlayerKey(currentPlayer)] = score;
  saveScores(scores);
}

function startGame() {
  if (isHost()) {
    showHostScreen();
    return;
  }

  currentQuestionIndex = 0;
  score = 0;
  waitingForNextQuestion = false;
  restartButton.hidden = true;
  showScreen(gameScreen);
  showQuestion();
}

function allPlayersFinished() {
  const scores = getScores();
  const triviaPlayers = getTriviaPlayers();

  if (triviaPlayers.length === 0) {
    return true;
  }

  return triviaPlayers.every((player) => hasScoreForPlayer(scores, player));
}

function renderScores() {
  const scores = getScores();
  const players = pruneInactivePlayers();
  const triviaPlayers = getTriviaPlayers();
  const finishedCount = triviaPlayers.filter((player) => hasScoreForPlayer(scores, player)).length;
  const hostPlayer = players[0];
  const rankedPlayers = triviaPlayers
    .map((player) => {
      const playerKey = getPlayerKey(player);
      const hasScore = hasScoreForPlayer(scores, player);

      return {
        key: playerKey,
        displayName: getPlayerDisplayName(player),
        hasScore,
        score: hasScore ? getScoreForPlayer(scores, player) : -1,
      };
    })
    .sort((firstPlayer, secondPlayer) => {
      if (secondPlayer.score !== firstPlayer.score) {
        return secondPlayer.score - firstPlayer.score;
      }

      return firstPlayer.displayName.localeCompare(secondPlayer.displayName);
    });
  const firstPlace = rankedPlayers.find((player) => player.hasScore);

  finishedText.textContent = `${finishedCount} of ${triviaPlayers.length} finished`;
  scoreList.innerHTML = "";

  if (hostPlayer) {
    const hostItem = document.createElement("li");
    hostItem.textContent = `${getPlayerDisplayName(hostPlayer)}: Host - not playing`;
    scoreList.append(hostItem);
  }

  rankedPlayers.forEach((player, index) => {
    const scoreItem = document.createElement("li");
    const place = index + 1;
    const playerScore = player.hasScore ? `${player.score} points` : "Still playing";
    let firstPlaceText = "";

    if (firstPlace && player.key === firstPlace.key) {
      scoreItem.classList.add("first-place");
      firstPlaceText = " - FIRST PLACE";
    }

    scoreItem.textContent = `${place}. ${player.displayName}: ${playerScore}${firstPlaceText}`;
    scoreList.append(scoreItem);
  });

  if (triviaPlayers.length === 0) {
    hostMessage.textContent = "No players joined yet.";
    resetLobbyButton.hidden = false;
  } else if (allPlayersFinished()) {
    hostMessage.textContent = "Everyone finished. Only the host can see these points.";
    resetLobbyButton.hidden = false;
  } else {
    hostMessage.textContent = "Players are taking the trivia.";
    resetLobbyButton.hidden = true;
  }
}

function showHostScreen() {
  stopTimer();
  clearTimeout(nextQuestionTimeout);
  showScreen(hostScreen);
  renderScores();
}

function handleEmailSubmit(event) {
  event.preventDefault();

  if (!firstNameInput.checkValidity() || !lastNameInput.checkValidity() || !emailInput.checkValidity()) {
    loginMessage.textContent = "Please enter your first name, last name, and a real email.";
    return;
  }

  joinLobby({
    firstName: firstNameInput.value,
    lastName: lastNameInput.value,
    email: emailInput.value,
  });
}

function handleStartGame() {
  if (!isHost()) {
    return;
  }

  saveScores({});
  localStorage.setItem(GAME_STARTED_KEY, "true");
  showHostScreen();
}

function resetLobby() {
  if (!isHost() || !allPlayersFinished()) {
    return;
  }

  saveScores({});
  localStorage.setItem(GAME_STARTED_KEY, "false");
  renderLobby();
  showScreen(lobbyScreen);
}

function resetGame() {
  if (!isHost()) {
    return;
  }

  savePlayers([]);
  saveScores({});
  localStorage.setItem(GAME_STARTED_KEY, "false");
  localStorage.setItem(GAME_RESET_KEY, String(Date.now()));
  clearLocalPlayer();
}

answerButtons.forEach((button) => {
  button.addEventListener("click", chooseAnswer);
});

emailForm.addEventListener("submit", handleEmailSubmit);
startGameButton.addEventListener("click", handleStartGame);
lobbyResetGameButton.addEventListener("click", resetGame);
resetLobbyButton.addEventListener("click", resetLobby);
resetGameButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", restartGame);

window.addEventListener("storage", (event) => {
  if (event.key === LOBBY_PLAYERS_KEY && !lobbyScreen.hidden) {
    renderLobby();
  }

  if (event.key === LOBBY_PLAYERS_KEY && isHost() && !hostScreen.hidden) {
    renderScores();
  }

  if (event.key === GAME_STARTED_KEY && event.newValue === "true" && currentPlayer) {
    startGame();
  }

  if (event.key === PLAYER_SCORES_KEY && isHost() && !hostScreen.hidden) {
    renderScores();
  }

  if (event.key === GAME_RESET_KEY) {
    clearLocalPlayer();
  }
});

window.addEventListener("beforeunload", () => {
  removeCurrentPlayerFromLobby();
});

currentPlayer = getSavedCurrentPlayer();
pruneInactivePlayers();

let currentPlayerInLobby = currentPlayer && isCurrentPlayerInLobby();

if (currentPlayer && !currentPlayerInLobby) {
  currentPlayerInLobby = addPlayer(currentPlayer);

  if (currentPlayerInLobby) {
    saveCurrentPlayer(currentPlayer);
  }
}

if (currentPlayer && currentPlayerInLobby) {
  startLobbyHeartbeat();
  firstNameInput.value = currentPlayer.firstName;
  lastNameInput.value = currentPlayer.lastName;
  emailInput.value = currentPlayer.email;
  renderLobby();

  if (isGameStarted()) {
    if (isHost()) {
      showHostScreen();
    } else {
      startGame();
    }
  } else {
    showScreen(lobbyScreen);
  }
} else {
  sessionStorage.removeItem(CURRENT_PLAYER_KEY);
  sessionStorage.removeItem("triviaCurrentEmail");
  currentEmail = "";
  currentPlayer = null;
  showScreen(loginScreen);
}
