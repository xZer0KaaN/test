function checkForNewMessages() {
	$.get("/api/moderator/push", function(resp) {
		if (resp.messages.length > 0) {
			showPushMessage(resp.messages);
		}
	}).always(function() {
		setTimeout(checkForNewMessages, 30000);
	});
}

function showPushMessage(htmlMessage) {
	var modal = $('#pushModal');
	if (htmlMessage && htmlMessage.length > 0) {
		var messagesContainer = $('#pushMessages');
		messagesContainer.empty();
		messagesContainer.append(htmlMessage);
		modal.modal('show');
	} else {
		modal.modal('hide');
	}

}

function readed() {
	$.post("/api/moderator/push/readed", function(resp) {
	}).always(function() {
		$('#pushModal').modal('hide');
	});
}

$(function() {
	checkForNewMessages();
});
