$(document).ready(function() {	//скрипт для первой страницы и страниц ошибок
	var port = 8888;
	var socket = io.connect('http://localhost:' + port);
	//var socket = io.connect('https://immense-ocean-33333.herokuapp.com');

	function get_cookie ( cookie_name ) {	//получение значения cookie
	  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
	  if ( results )
	    return ( unescape ( results[2] ) );
	  else
	    return null;
	}

	var idCookie = get_cookie("id");

	socket.on('addId', function(id) {	//сервер отправил id
		if (idCookie) {		//если в cookie уже есть id
			socket.emit('authorized', idCookie);
		} else {
			document.cookie = "id=" + id; 	//иначе записывается
			idCookie = get_cookie("id");
		}
		$('hr').first().after("<a class='btn' id='send' target='_blank' href='https://telegram.me/SmolkovTestBot?start="+ idCookie +"'>Войти через Telegram</a>");
		$('#text').append('<p>/start '+ idCookie +'</p>');
		socket.emit('returnId', idCookie); 	//возврат id на сервер
	});

	socket.on('getHomepage', function() {	//переход на вторую страницу
		document.location.href='/homepage?'+ idCookie;
	});

	socket.on('enterAdmin', function() {
		document.location.href='/admin?'+ idCookie;
	});

	$(document).on('click', '#back', function() {	//выход со страниц ошибок
		document.location.href='/';
	});

	$(document).on('click', '#send', function() {	//обновление страницы пока пользователь в телеграме
		setInterval('location.reload()', 4000);
	});
})