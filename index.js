const uuid = require('uuid/v4');
const path = require('path');
const fs = require('fs');
const random_name = require('node-random-name');
const express = require('express');
const bodyParser = require('body-parser');
const hdate = require('human-date');
const pug = require('pug');
const ip = require('ip');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
  IP: ip.address(),
  PORT: 3000,
  get fullAddress() {
    return `http://${config.IP}:${config.PORT}`;
  },
  get writeUrl() {
    return `${config.fullAddress}/write`;
  },
  get styleUrl() {
    return `${config.fullAddress}/css/main.css`;
  }
};

const users = new Map();
const messages = new Map();

const getContentHTML = (userId) => {
  return pug.compileFile('views/body.pug')({
    lastModify: +new Date(),
    writeUrl: config.writeUrl,
    user: users.get(userId),
    messages: getMessagesHTML()
  });
};

const getMessagesHTML = () => {
  let messagesHTML = `
    <div class="messages">
  `;

  messages.forEach((message) => {
    message.dt = hdate.relativeTime(new Date(message.dt));

    messagesHTML += pug.compileFile('views/message.pug')({
      user: users.get(message.userId),
      message
    });
  });

  messagesHTML += `
    </div>
  `;

  return messagesHTML;
};

const redraw = () => {
  users.forEach((user) => user.res.write(getContentHTML(user.id)));
};

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Content-Encoding', 'chunked');
  res.setHeader('Connection', 'keep-alive');

  const userId = uuid();

  users.set(userId, {
    id: userId,
    nickname: random_name(),
    messages: [],
    res
  });

  const headHTML = pug.compileFile('views/head.pug')({
    title: 'Async web chat without JS in browser',
    styleUrl: config.styleUrl
  });

  res.write(headHTML);
  res.write(getContentHTML(userId));
});

app.post('/write', (req, res) => {
  if (!req.param('message').length) { return res.end(); }

  const userId = req.param('user_id');
  const user = users.get(userId);

  if (!user) { return res.end(); }

  const messageId = uuid();

  messages.set(messageId, {
    id: messageId,
    userId: req.param('user_id'),
    dt: +new Date(),
    message: req.param('message')
  });

  users.set(userId, {
    ...user,
    messages: [...user.messages, messageId]
  });

  redraw();

  res.end();
});

app.listen(config.PORT);

console.log(`Server listening on ${config.fullAddress} or http://127.0.0.1:${config.PORT}`);
