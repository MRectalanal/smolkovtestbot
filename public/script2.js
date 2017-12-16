function get_cookie ( cookie_name ) {	//получение значения cookie
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
  if ( results )
    return ( unescape ( results[2] ) );
  else
    return null;
}

$(document).ready(function() {	//скрипт для второй страницы
	var port = 8888;
	var socket = io.connect('http://localhost:' + port);
	//var socket = io.connect('https://immense-ocean-33333.herokuapp.com');
	var idCookie = get_cookie("id");	//id из куки
	
	socket.emit('getUsername', idCookie);		//запрос никнейма, полученного из телеграмма
	socket.on('username', function(username) {
		$('.usernameField').prepend('<h1>'+ username +'</h1>');
	});

	socket.emit('getAvatar', idCookie); //запрос фотографии из телеграмма
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

	socket.emit('getAllNotes', idCookie);		//запрос массива заметок
	socket.on('allNotes', function(notesArr) {		//получение заметок
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
			$('.notes').append("<hr><div class='note row' id='" + (notesArr.length-i-1) + "'><div class='col-md-7 col-xs-6'><p>" + notesArr[notesArr.length-i-1].text + "</p></div><div class='col-md-2 col-xs-2'><p class='note-date'>"+ currentDate +"</p></div><div class='col-md-3 col-xs-4'><button type='button' class='btn' id='edit_note'>Edit</button><button type='button' class='btn' id='del_note'>Delete</button></div></div>");
		}
	});

	socket.emit('getBio', idCookie);	//запрос био
	socket.on('Bio', function(bio) {
		$('#bio').prepend(bio);
	});

	socket.on('refresh', function() {		//обновление списка заметок
		$('.note').remove();
		$('hr').remove();
		socket.emit('getAllNotes', idCookie);
	});

	$(document).on('click', '#add', function() {	//добавление заметки
		if ($('#note_add_text').val()) {
			socket.emit('addNewNote', $('#note_add_text').val(), idCookie);
			$('#note_add_text').val('');
		}
	});

	$(document).on('click', '#del_note', function() {		//удаление заметки
		var noteId = parseInt($(this).parent().parent().attr('id'));
		socket.emit('deleteNote', noteId, idCookie);
		$(this).parent().parent().prev().remove();
		$(this).parent().parent().remove();
	});

	$(document).on('click', '#edit_note', function() {		//редактирование заметки
		if ($('.style_edit_note').length > 0) {
			$('.note').remove();
			$('hr').remove();
			socket.emit('getAllNotes', idCookie);
		}
		var editText = $(this).parent().parent().children('.col-md-7').children('p').text();
		console.log(editText);
		$(this).parent().parent().attr('class', 'style_edit_note note row');
		$(this).parent().parent().children('.col-md-7').children('p').remove();
		$(this).parent().parent().children('.col-md-2').remove();
		$(this).parent().parent().children('.col-md-7').append("<textarea id='note_edit_text'>");
		$(this).parent().parent().children('.col-md-7').attr('class', 'col-md-8 col-xs-8');
		$('#note_edit_text').val(editText);
		$(this).next('#del_note').remove();
		$(this).parent().append("<button type='button' class='btn' id='edit_save'>Save</button>");
		$(this).parent().append("<button type='button' class='btn' id='edit_cancel'>Сancel</button>");
		$(this).remove();
	});

	$(document).on('click', '#edit_cancel', function() {		//отмена редактирования
		$('.note').remove();
		$('hr').remove();
		socket.emit('getAllNotes', idCookie);
	});

	$(document).on('click', '#edit_save', function() {		//сохранение отредактированной заметки
		var thisId = $(this).parent().parent().attr('id');
		var editText = $(this).parent().parent().children('.col-md-8').children('textarea').val();
		socket.emit('editNote', editText, thisId, idCookie);
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
			socket.emit('editBio', bioText, idCookie);
			$('.usernameField').append('<p id="bio"><button id="edit_bio"><img src="images/edit-btn.png"></button></p>');
			$('#bio').text(bioText);
		});
	});

	$(document).on('click', '#search', function() {	//переход на страницу поиска
		document.location.href='/search?'+ idCookie;
	});
})