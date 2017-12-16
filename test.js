var redis = require('redis');
var client = redis.createClient();
client.on("error", function (err) {
	console.log("Redis error: " + err);
});

client.set('myKey', 'Hello Redis', function (err, repl) {
	if (err) {
		console.log('Что то случилось при записи: ' + err);
		client.quit();
	} else {
		client.get('myKey', function (err, repl) {
			client.quit();
			if (err) {
				console.log('Что то случилось при чтении: ' + err);
			} else if (repl) {
				console.log('Ключ: ' + repl);
			} else {
				console.log('Ключ ненайден.')
			}
		});
	}
});