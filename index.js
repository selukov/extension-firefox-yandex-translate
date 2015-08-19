const { getMostRecentBrowserWindow } = require('sdk/window/utils');

var 
	uuid = require('sdk/util/uuid').uuid(),
	uuidstr = uuid.number.substring(1, 37),
	notifications = require("sdk/notifications"),
	contextMenu = require("sdk/context-menu"),
	Request = require("sdk/request").Request,
	self = require('sdk/self'),
	data = require('sdk/self').data,
	tabs = require('sdk/tabs'),
	selection = require('sdk/selection'),
	prefs = require('sdk/simple-prefs').prefs,
	cmitems = null,
	{ ActionButton } = require('sdk/ui/button/action'),

	wasTranslatedSecondTime = false,
	inProgress = '...',
	translated = '',
	selectionText = '',
	key = "trnsl.1.1.20150627T071448Z.117dacaac1e63b79.6b1b4bb84635161fcd400dace9fb2220d6f344ef",

	button = ActionButton({
		id: 'translate-button',
		label: 'Replace selected text with translated',
		icon: './ico.png',
		context: contextMenu.SelectionContext(),
		contentScriptFile: data.url('script.js'),
		onClick: function() {
			if (selection.text) {
				translate('ru', selection.text, key, function() {selection.html = translated;}); // default direction - from EN to RU
			} else popup('Nothing selected');
		} 
	}),

	menuItem = contextMenu.Item({
		data: uuidstr, // for 'binding' tooltop's 'id' + text
		label: inProgress, // ...
		image: self.data.url('ico.png'),
		context: contextMenu.SelectionContext(),
		contentScriptFile: data.url('script.js'),
		onMessage: function(message) {
			if (message.name == 'context') {
				menuItem.label = inProgress; // ...
				if (cmitems != undefined) cmitems[0].tooltipText = '';
				var input = message.data.replace('&', '%26');
				translate('ru', input, key); // default direction - from EN to RU
			} else { // if (message.name == 'click')
				tabs.open(message.data);
			}
		}
	})
;

function translate(lang, input, key, callback) {
	Request({ // key is not referral but API-key: https://api.yandex.com/translate/doc/dg/concepts/api-overview.xml
		url: 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=' + key + '&lang=' + lang + '&text=' + input,
		onComplete: function (response) {
			if (response.json.code == 200) { // ok
				translated = response.json.text[0];
				if (input == translated && wasTranslatedSecondTime == false) {  // if input on Russian and we receive the same text -
					translate('en', input, key);                                     // translate again selected text into English
					wasTranslatedSecondTime = true;
				} else { // show results
					if (prefs.popup) popup(translated);
					menuItem.label = translated;
					wasTranslatedSecondTime = false;
					if (prefs.tooltip && !callback) tooltip(translated);
					getMostRecentBrowserWindow().document.querySelectorAll('#text').value = translated;
				}
				if (callback) callback();
			} else if (prefs.keyUsers == '') { // key ended and user not input own key in preferences
				menuItem.label = ':(';
				notifications.notify({
					title: 'API-key ended - for continue of translating please get another one, it is free',
					text: 'Click here for opening page when you can get another API-key. After getting key - insert in preferences of this addon',
					time: 50000,
					onClick: function() {
						tabs.open('https://tech.yandex.com/keys');
					}
				})
			}
		}
	}).get();
}

function popup(text) {
	if (text.length > 0)
		notifications.notify({
			title: 'translate.yandex.ru',
			text: text,
			time: 5000
		})
}

function tooltip(translated) {
	menuItem.data = uuidstr + translated;
	cmitems = getMostRecentBrowserWindow().document.querySelectorAll(".addon-context-menu-item[value^='"+uuidstr+"']");
	cmitems[0].tooltipText = cmitems[0].value.substring(36);
}
