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

	socket.emit('getBio', idCookie);	//запрос био
	socket.on('Bio', function(bio) {
		$('#bio').prepend(bio);
	});

	socket.emit('getAllUsers');
	socket.on('allUsers', function(searchResult) {	//вывод результатов поиска
		if (searchResult.length == 1) {
			$('.notes').append('<h1>В базе данных '+ searchResult.length +' пользователь</h1>');
		} else if (searchResult.length >= 2 && searchResult.length <= 4) {
			$('.notes').append('<h1>В базе данных '+ searchResult.length +' пользователя</h1>');
		} else {
			$('.notes').append('<h1>В базе данных '+ searchResult.length +' пользователей</h1>');
		}
		for (var i = 0; i < searchResult.length; i++) {
			$('.notes').append('<div class="note row"><hr style="margin-top: 0px; margin-bottom: 15px;"><div class="col-xs-12"><a href="#" class="admin-view" id="'+ searchResult[i] +'">'+ searchResult[i] +'</a></div></div>');
		}
	});

	$(document).on('click', '.admin-view', function() {
		document.location.href='/adminview?' + $(this).attr('id') + '&' + idCookie;
	});

	/*socket.on('refresh', function() {		//обновление списка заметок
		$('.note').remove();
		$('hr').remove();
		socket.emit('getAllNotes', idCookie);
	});

	$(document).on('click', '#del_note', function() {		//удаление заметки
		var noteId = parseInt($(this).parent().parent().parent().attr('id'));
		socket.emit('deleteNote', noteId, idCookie);
		$(this).parent().parent().parent().prev().remove();
		$(this).parent().parent().parent().remove();
	});*/

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
});