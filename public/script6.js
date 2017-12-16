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

	socket.emit('getAdminStatus', idCookie);
	socket.on('adminStatus', function(adminStatus){
		if (!adminStatus) {
			socket.emit('getAllGuestNotes', idCookie);		//запрос массива заметок
			$('.usernameField').append('<p class="admin-options"><a id="makeAdmin" href="#">Сделать администратором</a> | <a id="deleteUser" href="#">Удалить пользователя</a></p>');
		} else {
			$('.container').children().last().remove();
		}
	});

	$(document).on('click', '#exit', function() {	//разлогин
		socket.emit('exit', idCookie);
		document.location.href='/';
	});

	socket.on('allNotes', function(notesArr) {		//получение заметок
		if (notesArr.length == 1) {
			$('.notes').append('<h1>'+ notesArr.length +' запись:</h1>');
		} else if (notesArr.length == 0) {
			$('.notes').append('<h1>Нет записей</h1>');
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
			$('.notes').append("<hr><div class='note row' id='" + (notesArr.length-i-1) + "'><div class='col-md-7 col-xs-6'><p>" + notesArr[notesArr.length-i-1].text + "</p></div><div class='col-md-2 col-xs-2'><p class='note-date'>"+ currentDate +"</p></div><div class='col-md-3 col-xs-4'><button type='button' class='btn' id='del_note' style='width: 100%;'>Delete</button></div></div>");
		}
	});

	$(document).on('click', '#del_note', function() {		//удаление заметки
		var noteId = parseInt($(this).parent().parent().parent().attr('id'));
		socket.emit('adminDeleteNote', noteId, idCookie);
		$(this).parent().parent().parent().children('h1').remove();
		$(this).parent().parent().prev().remove();
		$(this).parent().parent().remove();
	});

	socket.emit('getGuestBio', idCookie);	//запрос био
	socket.on('Bio', function(bio) {
		$('#bio').prepend(bio);
	});

	$(document).on('mouseover', '#bio', function() {	//показывает карандаш около био
		$("#edit_bio").attr('style', 'display: initial');
	});

	$(document).on('mouseout', '#bio', function() {	//скрывает карандаш
		$("#edit_bio").attr('style', 'display: none');
	});

	$(document).on('click', '#edit_bio', function() {	//редактирует био
		var bioText = $('#bio').text();
		$('#bio').remove();
		$('.usernameField').append('<input type="text" id="bio_edit"></input><button type="button" class="btn" id="bio_save">Save</button>');
		$('#bio_edit').val(bioText);
		$(document).on('click', '#bio_save', function() {
			bioText = $('#bio_edit').val();
			$('#bio_edit').remove();
			$('#bio_save').remove();
			socket.emit('adminEditBio', bioText, idCookie);
			$('.usernameField').append('<p id="bio"><button id="edit_bio"><img src="images/edit-btn.png"></button></p>');
			$('#bio').text(bioText);
		});
	});

	socket.on('refresh', function() {		//обновление списка 
		$('.note').remove();
		$('hr').remove();
		socket.emit('getAllGuestNotes', idCookie);
	});

	socket.on('stepBack', function(){
		document.location.href='/admin?'+ idCookie;
	});

	$(document).on('click', '#homepage', function() {	//переход на страницу профиль
		document.location.href='/admin?'+ idCookie;
	});

	$(document).on('click', '#makeAdmin', function() {
		if (confirm('Сделать данного пользователя администратором?')) {
			socket.emit('makeAdmin', idCookie);
		}
	});

	$(document).on('click', '#deleteUser', function() {
		if (confirm('Удалить данного пользователя из базы данных?')) {
			socket.emit('deleteUser', idCookie);
		}
	});
})