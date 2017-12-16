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

	$('#search_text').keypress(function (e) {	//нажатие на enter
    	if (e.which == 13) {
            $("#find").click();	//запускает поиск
        }
    });

	$(document).on('click', '#find', function() {	//поиск
		var searchText = $('#search_text').val();
		if (searchText !== "") {
			socket.emit('search', searchText);
			$('.note').remove();
		}
	});

	socket.on('searchResult', function(searchResult) {	//вывод результатов поиска
		for (var i = 0; i < searchResult.length; i++) {
			$('.notes').append('<div class="note row"><hr style="margin-top: 0px; margin-bottom: 15px;"><div class="col-xs-12"><a href="#" class="guest" id="'+ searchResult[i] +'">'+ searchResult[i] +'</a></div></div>');
		}
	});

	$(document).on('click', '.guest', function() {
		document.location.href='/guest?' + $(this).attr('id') + '&' + idCookie;
	});
	
	$(document).on('click', '#exit', function() {	//разлогин
		socket.emit('exit', idCookie);
		document.location.href='/';
	});

	$(document).on('click', '#homepage', function() {	//переход на страницу профиль
		document.location.href='/homepage?'+ idCookie;
	});
})