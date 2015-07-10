var contextMenu = require("sdk/context-menu");
var Request = require("sdk/request").Request;
var self = require('sdk/self');
var tabs = require('sdk/tabs');
var translating = 'translating...';
var translatedTimes = 0;

var menuItem = contextMenu.Item({
	label: translating,
	image: self.data.url('ico.png'),
	context: contextMenu.SelectionContext(),
	contentScript: 'self.on("context", function() {' +
						'var selectionText = window.getSelection().toString();' +
						'self.postMessage({name:"context", data:selectionText});' +
						'return true;' +
					'});' +
					'self.on("click", function() {' +
						'var selectionText = window.getSelection().toString();' +
						'self.postMessage({name:"click", data:"https://translate.yandex.ru?text=" + selectionText.replace("&", "%26")});' +
					'})',
	onMessage: function(message) {
		if (message.name == 'context') {
			menuItem.label = translating;
			var input = message.data.replace('&', '%26');
			translate('ru', input) // default direction - from EN to RU
		} else {
			tabs.open(message.data);
		}
	}
});

function translate(lang, input) {
	Request({ // key is not referral but API-key: https://api.yandex.com/translate/doc/dg/concepts/api-overview.xml
		url: 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20150627T071448Z.117dacaac1e63b79.6b1b4bb84635161fcd400dace9fb2220d6f344ef&lang=' +
																					lang + '&text=' + input,
		onComplete: function (response) {
			var translated = response.json.text[0];
			translatedTimes++;
			if (input == translated && translatedTimes < 2) {  // if input on Russian and we receive the same text -
				translate('en', input);                        // translate again selected text into English
			} else {
				menuItem.label = translated;
				translatedTimes = 0;
			}
		}
	}).get();
}


