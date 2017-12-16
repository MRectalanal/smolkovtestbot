function get_cookie ( cookie_name ) {	//получение значения cookie
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
  if ( results )
    return ( unescape ( results[2] ) );
  else
    return null;
}

$(document).ready(function() {	//скрипт для страницы посещения другого пользователя
	var port = 8888;
	var socket = io.connect('http://localhost:' + port);
	//var socket = io.connect('https://immense-ocean-33333.herokuapp.com');
	var idCookie = get_cookie("id");	//id из куки
	
	socket.emit('getGuestUsername', idCookie);		//запрос никнейма из бд
	socket.on('username', function(username) {
		$('.usernameField').prepend('<h1>'+ username +'</h1>');
	});

	socket.emit('getGuestAvatar', idCookie); //запрос фотографии из бд
	socket.on('avatar', function(avatar) {
		if (avatar === 'undefined') {
			$('#ava').attr("src", "images/undefined.png");
		} else {
			$('#ava').attr("src", "https://api.telegram.org/file/" + avatar + ".jpg");
		}
	});

	$(document).on('click', '#exit', function() {	//разлогин
		socket.emit('exit', idCookie);
		document.location.href='/';
	});

	socket.emit('getAllGuestNotes', idCookie);		//запрос массива заметок
	socket.on('allNotes', function(notesArr) {		//получение заметок
		if (notesArr.length == 1) {
			$('.notes').append('<h1>'+ notesArr.length +' запись:</h1>');
		} else if (notesArr.length >= 2 && notesArr.length <= 4) {
			$('.notes').append('<h1>'+ notesArr.length +' записи:</h1>');
		} else {
			$('.notes').append('<h1>'+ notesArr.length +' записей:</h1>');
		}
		for (var i = 0; i < notesArr.length; i++) {
			var tempDate = new Date(notesArr[notesArr.length-i-1].date);
			var nowTime = new Date();
			var currentDate = "";
			if (nowTime-tempDate < 86400000) {
				var hours = (nowTime-tempDate-((nowTime-tempDate) % 3600000))/3600000;
				if (hours != 0) currentDate += hours +" ч ";
				var minutes = (nowTime-tempDate-hours*3600000-((nowTime-tempDate-hours*3600000) % 60000))/60000;
				if (minutes != 0) currentDate += minutes +" м ";
				var seconds = (nowTime-tempDate-hours*3600000-minutes*60000-((nowTime-tempDate-hours*3600000-minutes*60000) % 1000))/1000;
				if (seconds != 0) currentDate += seconds +" с";
			} else if (nowTime-tempDate < 31536000000) {
				var days = (nowTime-tempDate-((nowTime-tempDate) % 86400000))/86400000;
				if (days != 0) currentDate += days +" дн";
			} else {
				var years = (nowTime-tempDate-((nowTime-tempDate) % 31536000000))/31536000000;
				if (years != 0) currentDate += years +" г";
			}
			$('.notes').append("<hr><div class='note row' id='" + (notesArr.length-i-1) + "'><div class='col-xs-9'><p>" + notesArr[notesArr.length-i-1].text + "</p></div><div class='col-xs-3'><p class='note-date'>"+ currentDate +"</p></div></div>");
		}
	});

	socket.emit('getGuestBio', idCookie);	//запрос био
	socket.on('Bio', function(bio) {
		$('#bio').prepend(bio);
	});

	socket.on('refresh', function() {		//обновление списка заметок
		$('.note').remove();
		$('hr').remove();
		socket.emit('getAllGuestNotes', idCookie);
	});

	$(document).on('click', '#search', function() {	//переход на страницу поиска
		document.location.href='/search?'+ idCookie;
	});

	$(document).on('click', '#homepage', function() {	//переход на страницу профиль
		document.location.href='/homepage?'+ idCookie;
	});
})