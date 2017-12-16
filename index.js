var express = require('express');
const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var url = require('url');
var fs = require('fs');

var redis = require('redis');
var client = redis.createClient();
client.on("error", function (err) {
	console.log("Redis error: " + err);
});

/*var couchbase = require('couchbase');
var cluster = new couchbase.Cluster('couchbase://localhost/');
var bucket = cluster.openBucket('notes');
var ViewQuery = couchbase.ViewQuery;*/

var TelegramBot = require('node-telegram-bot-api');
var token = '401383804:AAEHY-9uFhQ546dIOEa5vx4PCChfXiw3P88';
var bot = new TelegramBot(token, {polling: true});
var request = require('request');

class User {
	constructor(id, username, photo_code) { 
		this.id = id;
		this.username = username;
		this.photo_code = photo_code;
		this.usernotes = [];
		this.guest = "";
		this.admin = false;
	}
}
var user = [];	//массив активных юзеров
user[0] = new User('', '', '');	//дефолтный для входа

server.listen(8888);
//server.listen(process.env.PORT || 8888);
console.log('Server is running');
app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {
	user[0].id = socket.id.toString().substr(0,7);
	socket.emit('addId', user[0].id);	//генерация и отправка id

	socket.on('returnId', function(cookieId) {	//возврат значения id из cookie
		user[0].id = cookieId;	//если уже был на сайте, то есть id в cookie
	});

	socket.on('authorized', function(idCookie) { //в cookie уже есть id
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {	//если юзер уже входил
				var tempUname = user[i].username;
				client.get(tempUname, function(err, result) {
					if (result) {
						result = JSON.parse(result);
						if (result.admin) {
							socket.emit('enterAdmin');
						} else {
							socket.emit('getHomepage');	//откр личную страницу
						}
					} else {
						socket.emit('getHomepage');	//откр личную страницу для нового пользователя
					}
				});
			}
		}
	});

	socket.on('getUsername', function(idCookie) {	//запрос никнейма из телеграма для домашней страницы
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				socket.emit('username', user[i].username);
			}
		}
	});

	socket.on('getAvatar', function(idCookie) {	//запрос ссылки на фото
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				socket.emit('avatar', user[i].photo_code);
			}
		}
	});

	socket.on('getBio', function (idCookie) {	//запрос био
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				client.get(user[i].username, function(err, result) {
					if (result) {
						result = JSON.parse(result);
						bio = result.bio;
						socket.emit('Bio', bio);
					}
					else {
						console.log('No bio');
					}
				});
			}
		}
	});

	socket.on('exit', function (idCookie) {	//разлогин
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {	//удаляется из массива активных юзеров
				user.splice(i, 1);
			}
		}
		client.del('undefined', function(err, result) {});
	});

	socket.on('getAllNotes', function(idCookie) {		//запрос массива заметок
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				var tempUname = user[i].username;
				var tempPH = user[i].photo_code;
				var tempUNotes = [];
				client.get(tempUname, function(err, result) {
					if (result) {
						result = JSON.parse(result);
						tempUNotes = result.usernotes;
						socket.emit('allNotes', tempUNotes);
					}
					else {		//если документа с указанным именем не сущ, то создаётся новый
						var value = { 'usernotes': [], 'bio': 'Расскажите о себе...', 'photo_code': tempPH, 'admin': false};
						value = JSON.stringify(value);
						client.set(tempUname, value, function (err, result) {
							if (result) {
								console.log('Added a new user: ', tempUname);
							}
						});
					}
				});
			}
		}
	});

	socket.on('addNewNote', function(textNote, idCookie) { //добавление новой заметки
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				var date = new Date();
				var newNote = {text: textNote, date: date};
				var tempUname = user[i].username;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.usernotes.push(newNote);
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (result) socket.emit('refresh');
							else console.log('Error adding note: ' + err);
						});
					}
				});
			}
		}
	});

	socket.on('editNote', function(editNote, id, idCookie) {	//изменение заметки
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				var tempUname = user[i].username;
				var tempUNotes = [];
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.usernotes[id].text = editNote;
						result.usernotes[id].date = new Date();
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (result) socket.emit('refresh');
							else console.log('Error editing note: ' + err);
						});
					}
				});
			}
		}
	});

	socket.on('deleteNote', function(id, idCookie) {	//удаление заметки
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				var tempUname = user[i].username;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.usernotes.splice(id, 1);
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (result) socket.emit('refresh');
							else console.log('Error deleting note: ' + err);
						});
					}
				});
			}
		}
	});

	socket.on('editBio', function(bioText, idCookie) {	//изменение био
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				var tempUname = user[i].username;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.bio = bioText;
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (err) console.log('Error updating bio: ' + err);
						});
					} else {
						console.log('Error updating bio: ' + err);
					}
				});
				socket.emit('refresh');
			}
		}
	});


	socket.on('search', function(searchText) {
		client.keys('*'+searchText+'*', function(err, result) {
			if (result) {
				socket.emit('searchResult', result);
			} else {
				console.log('Searching error:' + err);
			}
		});
	});

	socket.on('getGuestUsername', function(idCookie) {
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				socket.emit('username', user[i].guest);
			}
		}
	});

	socket.on('getGuestAvatar', function(idCookie) {	//запрос ссылки на фото
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				client.get(user[i].guest, function(err, result){
					if (result) {
						result = JSON.parse(result);
						socket.emit('avatar', result.photo_code);
					} else {
						socket.emit('avatar', undefined);
					}
				});
			}
		}
	});

	socket.on('getGuestBio', function (idCookie) {	//запрос био
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				client.get(user[i].guest, function(err, result){
					if (result) {
						result = JSON.parse(result);
						if (result.bio != "Расскажите о себе...") socket.emit('Bio', result.bio);
					}
				});
			}
		}
	});

	socket.on('getAllGuestNotes', function(idCookie) {		//запрос массива заметок
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie) {
				client.get(user[i].guest, function(err, result) {
					if (result) {
						result = JSON.parse(result);
						socket.emit('allNotes', result.usernotes);
					}
					else console.log(err);
				});
			}
		}
	});

	socket.on('getAllUsers', function() {
		client.keys('*', function(err, result) {
			if (result) {
				socket.emit('allUsers', result);
			} else {
				console.log('Searching error:' + err);
			}
		});
	});

	socket.on('getAdminStatus', function(idCookie){
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie && user[i].admin) {
				client.get(user[i].guest, function(err, result) {
					if (result) {
						result = JSON.parse(result);
						socket.emit('adminStatus', result.admin);
					}
					else console.log(err);
				});
			}
		}
	});

	socket.on('adminDeleteNote', function(id, idCookie) {	//удаление заметки
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie && user[i].admin) {
				var tempUname = user[i].guest;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.usernotes.splice(id, 1);
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (result) socket.emit('refresh');
							else console.log('Error deleting note: ' + err);
						});
					}
				});
			}
		}
	});

	socket.on('adminEditBio', function(bioText, idCookie) {	//изменение био
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie && user[i].admin) {
				var tempUname = user[i].guest;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.bio = bioText;
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (err) console.log('Error updating bio: ' + err);
							else socket.emit('refresh');
						});
					} else {
						console.log('Error updating bio: ' + err);
					}
				});
			}
		}
	});

	socket.on('makeAdmin', function(idCookie) {
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie && user[i].admin) {
				tempUname = user[i].guest;
				client.get(tempUname, function(err, result){
					if (result) {
						result = JSON.parse(result);
						result.bio = 'admin';
						result.admin = true;
						result = JSON.stringify(result);
						client.set(tempUname, result, function(err, result){
							if (err) console.log('Error making an admin: ' + err);
							else socket.emit('stepBack');
						});
					} else {
						console.log('Error making an admin: ' + err);
					}
				});
			}
		}
	});

	socket.on('deleteUser', function(idCookie) {
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == idCookie && user[i].admin) {
				tempUname = user[i].guest;
				client.del(tempUname, function (err, result) {
					if (result) {
						for (var j = 1; j < user.length; j++) {
							if (user[j].username == tempUname) {
								user.splice(j, 1);
							}
						}
						console.log('User ', tempUname, ' is delite');
						socket.emit('stepBack');
					} else {
						console.log(err);
					}
				});
			}
		}
	});
});

app.get('/login', function (req, res) {		//приём запроса от телеграма
	var str = url.parse(req.url, true).search;	//берём параметры, переданные телеграмом
	if (str) {
		tUsername = str.match(/\?(.*)\?\?/)[1];	//никнейм из телеграма
		var telegramId = str.match(/\?\?(.*)&/)[1];	//id от которого выполнялась авторизация
		tPhoto_code = str.match(/&(.*)/)[1];
		if (telegramId === user[0].id) {
			user[user.length] = new User(telegramId, tUsername, tPhoto_code);	//при авторизации в телеге создаётся новый юзер в массиве
			user[0].id = '';	//нулевой юзер становится вновь пустым
			res.writeHead(200, {});
			res.end();
		} else {
			res.writeHead(401, {});
			res.end();
		}
	}else{
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
		res.end(page);
	}
});

app.get('/homepage', function (req, res) {	//запрос второй страницы
	if (url.parse(req.url, true).search) {
		var homepageId = url.parse(req.url, true).search.match(/\?(.*)/)[1];	//берём id от клиента
		var temp = false;
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == homepageId) {	//если такой юзер есть в массиве активных
				temp = true;
			}
		}
		if (temp) {	//если авторизовался
			var page = fs.readFileSync('public/homepage.html');
	    	res.writeHead(200, {'Content-Type': 'text/html'});
		}
		else {
			var page = fs.readFileSync('public/unauthorized.html');	//страница 401
			res.writeHead(401, {'Content-Type': 'text/html'});
		}
	} else {
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
	}
	res.end(page);
});

app.get('/search', function (req, res) {	//запрос второй страницы
	if (url.parse(req.url, true).search) {
		var userId = url.parse(req.url, true).search.match(/\?(.*)/)[1];	//берём id от клиента
		var temp = false;
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == userId) {	//если такой юзер есть в массиве активных
				temp = true;
			}
		}
		if (temp) {	//если авторизовался
			var page = fs.readFileSync('public/search.html');
	    	res.writeHead(200, {'Content-Type': 'text/html'});
		}
		else {
			var page = fs.readFileSync('public/unauthorized.html');	//страница 401
			res.writeHead(401, {'Content-Type': 'text/html'});
		}
	} else {
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
	}
	res.end(page);
});

app.get('/guest', function (req, res) {	//запрос чужой страницы
	if (url.parse(req.url, true).search) {
		var guestName = url.parse(req.url, true).search.match(/\?(.*)&/)[1];
		var userId = url.parse(req.url, true).search.match(/&(.*)/)[1];
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == userId) {	//если такой юзер есть в массиве активных
				if (user[i].username == guestName) {
					var page = "<html><body><script>window.location.replace('/homepage?"+ userId+ "');</script></body></html>";
	    			res.writeHead(200, {'Content-Type': 'text/html'});
				} else {
					user[i].guest = guestName;
					var page = fs.readFileSync('public/guest.html');
	    			res.writeHead(200, {'Content-Type': 'text/html'});
				}
				res.end(page);
			}
		}
	} else {
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
	    res.end(page);
	}
});

app.get('/admin', function (req, res) {	//запрос второй страницы
	if (url.parse(req.url, true).search) {
		var userId = url.parse(req.url, true).search.match(/\?(.*)/)[1];	//берём id от клиента
		var temp;
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == userId) {	//если такой юзер есть в массиве активных
				temp = i;
			}
		}
		if (temp) {	//если авторизовался
			client.get(user[temp].username, function(err, result) {
				if (result) {
					result = JSON.parse(result);
					if (result.admin) {
						user[temp].admin = true;
						var page = fs.readFileSync('public/admin.html');	//страница 401
						res.writeHead(200, {'Content-Type': 'text/html'});
						res.end(page);
					}
				} else {
					var page = fs.readFileSync('public/unauthorized.html');	//страница 401
					res.writeHead(401, {'Content-Type': 'text/html'});
					res.end(page);
				}
			});
		}
		else {
			var page = fs.readFileSync('public/unauthorized.html');	//страница 401
			res.writeHead(401, {'Content-Type': 'text/html'});
			res.end(page);
		}
	} else {
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
		res.end(page);
	}
});

app.get('/adminview', function (req, res) {	//запрос чужой страницы
	if (url.parse(req.url, true).search) {
		var guestName = url.parse(req.url, true).search.match(/\?(.*)&/)[1];
		var userId = url.parse(req.url, true).search.match(/&(.*)/)[1];
		for (var i = 1; i < user.length; i++) {
			if (user[i].id == userId && user[i].admin) {	//если такой юзер есть в массиве активных
				if (user[i].username == guestName) {
					var page = "<html><body><script>window.location.replace('/admin?"+ userId+ "');</script></body></html>";
	    			res.writeHead(200, {'Content-Type': 'text/html'});
				} else {
					user[i].guest = guestName;
					var page = fs.readFileSync('public/adminview.html');
	    			res.writeHead(200, {'Content-Type': 'text/html'});
				}
				res.end(page);
			}
		}
	} else {
		var page = fs.readFileSync('public/unauthorized.html');	//страница 401
		res.writeHead(401, {'Content-Type': 'text/html'});
		res.end(page);
	}
});

app.get('*', function(req, res) {
	var page = fs.readFileSync('public/notfound.html');	//страница 404
    res.writeHead(404, {'Content-Type': 'text/html'});
	res.end(page);
});

bot.onText(/\/start (.+)/, function (msg, match) {
	function doRequest(username, match, userPic) {
		request('http://localhost:8888/login?' + username + '??' + match[1] + '&' + userPic, function (error, response) {	//предача параметров: никнейм и полученный id
			if (response) {
				if (response.statusCode === 200) {
					bot.sendMessage(fromId, "Авторизация прошла успешно! Можете вернуться в браузер.");
				} else {
					bot.sendMessage(fromId, "Не удалось авторизоваться. Может быть, попробуете ещё раз?");
				}
			}
		});
	}

 	var fromId = msg.from.id;
 	var username = msg.chat.username;
	if (username == undefined) { //если  в телеге нет юзернейм
		username = fromId;		//просто отправим id
	}
	bot.getUserProfilePhotos(fromId, 0, 1).then(function(data) {	//брём фото
		if (data.photos.length > 0) {
			bot.getFileLink(data.photos[0][0].file_id).then(function(data) {
				var userPic = data.substring(30).substring(0, data.substring(30).indexOf("."));	//обрезаем ссылку для отправки
				console.log('getPic');
				doRequest(username, match, userPic);
			});	//берём ссылку на фото
		} else {
			doRequest(username, match, 'undefined');
		}
	});
});