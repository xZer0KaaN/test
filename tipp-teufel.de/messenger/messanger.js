const months = [
    'Januar',
    'Februar',
    'M&aumlrz;',
    'April',
    'Mai',
    'Juni',
    'July',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember'
]

var userInfos = [];
var chatLoginNames = [];
var chatLoginAlias = [];
var chatLoginInfos = new Map();
var isFirstInfoMsg = true;

var GetStartInfos = true;
var acDeleteConversationsAllowed = true;
var levensteinMinimum = 0.65;
var minTextLength = 50;
var letterMinTextLength = 45;
var chatLoginMinTextLength = [];

var newTabBlinking = false;

function startMessanger() {
    getNewInfos();

    var newDialogBlinking = Cookies.get("new_dialog_blinking");
    if (newDialogBlinking && newDialogBlinking == 'true') {
        toggleTabBlinking();
    }

    window.onkeydown = function (event) {
        if (event.keyCode == 9) {
            event.preventDefault();
            var selectedLi = $("#profilSelection").find("[aria-selected='true']").closest('li');
            var index = $("#profilSelection li").index(selectedLi);
            if (event.shiftKey) {
                newIndex = index - 1;
            } else {
                newIndex = index + 1;
            }
            if (newIndex < 0 || newIndex >= $("#profilSelection li").length) {
                return;
            }
            var newSelectedLi = $("#profilSelection li").eq(newIndex);
            newSelectedLi.find("button").click();
        }
    };
}

function formateDate(dateString) {
    if (dateString) {
        var date = new Date(dateString);
        var year = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth() + 1;
        return formatNumber(day) + '.' + formatNumber(month) + '.' + year;
    } else {
        return "";
    }
}

function getNewInfos() {
    try {
        $.get("api/GetInfos" + GetInfoParameter(), function (resp) {
            try {
                levensteinMinimum = resp.levensteinMinimum;
                acDeleteConversationsAllowed = resp.acDeleteConversationsAllowed;
                if (resp.hasStartInfos) {
                    handleStartInfo(resp.startInfos)
                    GetStartInfos = false;
                }

                minTextLength = resp.minTextLength;

                if (resp.error != null) {
                    alert(resp.error.text);
                } else {
                    handleOpenDialoges(resp.openDialoges);
                    handleFavoDialoges(resp.favoDialoges);
                    handleVisitorDialoges(resp.visitorDialoges);
                    handleOnlineUserDialoge(resp.onlineUserDialoges);
                    handleSliderData(resp.sliderDialoges);
                    handleFavoLetterAllowments(resp.favoLetterAllowments);
                    handleOnlineLetterAllowments(resp.onlineLetterAllowments);
                    handleSv1FriendsLetterAllowments(resp.sv1FriendsLetterAllowments);
                    handleSv1DialogesLetterAllowments(resp.sv1DialogesLetterAllowments);

                    handleProblem({type: "clear"});

                    for (assignedChatlogin of resp.assignedChatLogins) {
                        var assignedChatloginId = assignedChatlogin.chatloginId;
                        chatLoginMinTextLength[assignedChatloginId] = assignedChatlogin.minTextLength;
                        if (!chatLoginInfos.has(assignedChatloginId + "")) {
                            GetStartInfos = true;
                        }
                    }
                    var profilSelectionContainer = $("#profilSelection");
                    for (liBtn of profilSelectionContainer.find("li")) {
                        var chatLoginId = $(liBtn).data("chatlogin-id");
                        var found = false;
                        for (assignedChatlogin of resp.assignedChatLogins) {
                            var assignedChatloginId = assignedChatlogin.chatloginId;
                            if (assignedChatloginId == chatLoginId) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            $(liBtn).remove();
                            var containerId = "messangerContainer_" + chatLoginId;
                            $("#" + containerId).remove();
                            chatLoginInfos.delete(chatLoginId + "");
                        }
                    }
                }
            } catch (e) {
                try {
                    console.error(e);
                } catch (e2) {

                }
            }
        }).fail(function () {
            handleProblem({type: 'chat_connect', text: 'Die Chatinfos konnten nicht abgehohlt werden.'})
        }).always(function () {
            setTimeout(function () {
                getNewInfos()
            }, 20000);
        });
    } catch (e) {
        handleProblem({type: 'chat_connect', text: 'Es gab ein Netzwerkproblem.'})
        console.error(e);
    }
}

function getValidatedLength(toCheckString, chatLoginId) {
    var emotiContainer = $("#emoticon-container_" + chatLoginId);
    var validatedString = toCheckString;
    emotiContainer.find("div").each(function (index, value) {
        validatedString = validatedString.replaceAll(":" + $(value).attr("title") + ":", "$");
    });
    return validatedString.length;
}

function loadBuddyRequests(chatLoginId) {
    disableControlls(chatLoginId, true);
    $('#buddyRequestsLoadingIndicator_' + chatLoginId).show();
    $('#initialBuddyRequestsBtn_' + chatLoginId).hide();
    $('#buddyRequestsItemContainer_' + chatLoginId).hide();

    $.get("api/messanger/load/friends/" + chatLoginId, function (resp) {
        handleDialog(resp, "friends");
        var overviewSelect = $('#dialogOverviewSelect_' + chatLoginId);
        overviewSelect.empty();
        for (var i = 1; i <= resp.maxPage; i++) {
            overviewSelect.append('<option ' + (resp.currentPage == i ? 'selected' : '') + ' value="' + ((i - 1) * 20) + '">Seite ' + i + ' von ' + resp.maxPage + '</option>')
        }
        $('#buddyRequestsItemContainer_' + chatLoginId).show();
        $('#buddyRequestsLoadingIndicator_' + chatLoginId).hide();
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function loadDialogOverview(chatLoginId, start) {
    disableControlls(chatLoginId, true);
    $('#dialogOverviewLoadingIndicator_' + chatLoginId).show();
    $('#initialDialogOverviewBtn_' + chatLoginId).hide();
    $('#dialogOverviewItemContainer_' + chatLoginId).hide();

    $.get("api/messanger/load/dialogs/" + chatLoginId + "/" + start.value, function (resp) {
        handleDialog(resp, "dialogesOverview");
        var overviewSelect = $('#dialogOverviewSelect_' + chatLoginId);
        overviewSelect.attr('data-currentstart', start.value);
        overviewSelect.empty();
        for (var i = 1; i <= resp.maxPage; i++) {
            overviewSelect.append('<option ' + (resp.currentPage == i ? 'selected' : '') + ' value="' + ((i - 1) * 20) + '">Seite ' + i + ' von ' + resp.maxPage + '</option>')
        }
        $('#dialogOverviewItemContainer_' + chatLoginId).show();
        $('#dialogOverviewLoadingIndicator_' + chatLoginId).hide();
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function loadNewUserOverview(chatLoginId, start) {
    disableControlls(chatLoginId, true);
    $('#newUserOverviewLoadingIndicator_' + chatLoginId).show();
    $('#initialNewUserOverviewBtn_' + chatLoginId).hide();
    $('#newUserOverviewItemContainer_' + chatLoginId).hide();
    $.get("api/messanger/load/new_user/" + chatLoginId + "/" + start.value, function (resp) {
        handleDialog(resp, "newUserOverview");
        var overviewSelect = $('#newUserOverviewSelect_' + chatLoginId);
        overviewSelect.attr('data-currentstart', start.value);
        overviewSelect.empty();
        for (var i = 1; i <= resp.maxPage; i++) {
            overviewSelect.append('<option ' + (resp.currentPage == i ? 'selected' : '') + ' value="' + ((i - 1) * 20) + '">Seite ' + i + ' von ' + resp.maxPage + '</option>')
        }
        $('#newUserOverviewItemContainer_' + chatLoginId).show();
        $('#newUserOverviewLoadingIndicator_' + chatLoginId).hide();
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function sendFavoLetter(chatLogin) {
    var favoTextContainer = $("#favoLetterTextContainer_" + chatLogin);
    var requestObject = {};
    requestObject['chatLogin'] = chatLogin;
    requestObject['type'] = 'FAVO';
    requestObject['chatType'] = chatLoginInfos.get(chatLogin + "").chatType;
    favoTextContainer.children().each(function (index, element) {
        requestObject['texts[' + index + ']'] = $(element).find('#favo_text' + index + '_' + chatLogin).val();
    });

    $('#favoLetterSubmitBtn_' + chatLogin).prop("disabled", true);
    $('#favoLetterLoadingIndicator_' + chatLogin).show();
    $.post("/api/letter/create", requestObject).done(function (resp) {
        if (resp.status == "OK") {
            handleFavoAllowment(resp.allowmentDTO);
            $('#favoLetterTextModal_' + chatLogin).modal('hide');
        } else if (resp.status == "INVALID_TEXTS") {
            handleTextErrors(favoTextContainer, resp.validTextData)
        } else if (resp.status == "ERROR") {
            alert("Probleme beim versenden Der Favo Anschreiben. Bitte aktualisieren! (Server)");
        }
    }).fail(function () {
        alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Netzwerk)");
    }).always(function () {
        $('#favoLetterLoadingIndicator_' + chatLogin).hide();
        $('#favoLetterSubmitBtn_' + chatLogin).prop("disabled", false);
    });
}

function handleTextErrors(textContainer, validTextData) {
    for (var i = 0; i < validTextData.length; i++) {
        if (validTextData[i]) {
            $(textContainer.children()[i]).removeClass("text-error");
        } else {
            $(textContainer.children()[i]).addClass("text-error");
        }
    }
}

function sendOnlineLetter(chatLogin) {
    var onlineTextContainer = $("#onlineLetterTextContainer_" + chatLogin);
    var requestObject = {};
    requestObject['chatLogin'] = chatLogin;
    requestObject['type'] = 'ONLINE';
    requestObject['chatType'] = chatLoginInfos.get(chatLogin + "").chatType;
    onlineTextContainer.children().each(function (index, element) {
        requestObject['texts[' + index + ']'] = $(element).find('#online_text' + index + '_' + chatLogin).val();
    });

    $('#onlineLetterSubmitBtn_' + chatLogin).prop("disabled", true);
    $('#onlineLetterLoadingIndicator_' + chatLogin).show();
    $.post("/api/letter/create", requestObject).done(function (resp) {
        if (resp.status == "OK") {
            handleOnlineAllowment(resp.allowmentDTO);
            $('#onlineLetterTextModal_' + chatLogin).modal('hide');
        } else if (resp.status == "INVALID_TEXTS") {
            handleTextErrors(onlineTextContainer, resp.validTextData)
        } else if (resp.status == "ERROR") {
            alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Server)");
        }
    }).fail(function () {
        alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Netzwerk)");
    }).always(function () {
        $('#onlineLetterLoadingIndicator_' + chatLogin).hide();
        $('#onlineLetterSubmitBtn_' + chatLogin).prop("disabled", false);
    });
}

function sendSv1FriendsLetter(chatLogin) {
    var sv1FriendsTextContainer = $("#sv1FriendsLetterTextContainer_" + chatLogin);
    var requestObject = {};
    requestObject['chatLogin'] = chatLogin;
    requestObject['type'] = 'AC_FRIENDS';
    requestObject['chatType'] = chatLoginInfos.get(chatLogin + "").chatType;
    sv1FriendsTextContainer.children().each(function (index, element) {
        requestObject['texts[' + index + ']'] = $(element).find('#sv1Friends_text' + index + '_' + chatLogin).val();
    });

    $('#sv1FriendsLetterSubmitBtn_' + chatLogin).prop("disabled", true);
    $('#sv1FriendsLetterLoadingIndicator_' + chatLogin).show();
    $.post("/api/letter/create", requestObject).done(function (resp) {
        if (resp.status == "OK") {
            handleSv1FriendsLetterAllowment(resp.allowmentDTO);
            $('#sv1FriendsLetterTextModal_' + chatLogin).modal('hide');
        } else if (resp.status == "INVALID_TEXTS") {
            handleTextErrors(sv1FriendsTextContainer, resp.validTextData)
        } else if (resp.status == "ERROR") {
            alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Server)");
        }
    }).fail(function () {
        alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Netzwerk)");
    }).always(function () {
        $('#sv1FriendsLetterLoadingIndicator_' + chatLogin).hide();
        $('#sv1FriendsLetterSubmitBtn_' + chatLogin).prop("disabled", false);
    });
}

function sendSv1FriendsMailLetter(chatLogin) {
    var sv1FriendsMailTextContainer = $("#sv1FriendsMailLetterTextContainer_" + chatLogin);
    var requestObject = {};
    requestObject['chatLogin'] = chatLogin;
    requestObject['type'] = 'AC_FRIENDSMAIL';
    requestObject['chatType'] = chatLoginInfos.get(chatLogin + "").chatType;
    sv1FriendsMailTextContainer.children().each(function (index, element) {
        requestObject['texts[' + index + ']'] = $(element).find('#sv1FriendsMail_text' + index + '_' + chatLogin).val();
    });

    $('#sv1FriendsMailLetterSubmitBtn_' + chatLogin).prop("disabled", true);
    $('#sv1FriendsMailLetterLoadingIndicator_' + chatLogin).show();
    $.post("/api/letter/create", requestObject).done(function (resp) {
        if (resp.status == "OK") {
            handleSv1FriendsMailLetterAllowment(resp.allowmentDTO);
            $('#sv1FriendsMailLetterTextModal_' + chatLogin).modal('hide');
        } else if (resp.status == "INVALID_TEXTS") {
            handleTextErrors(sv1FriendsMailTextContainer, resp.validTextData)
        } else if (resp.status == "ERROR") {
            alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Server)");
        }
    }).fail(function () {
        alert("Probleme beim versenden des Anschreiben. Bitte aktualisieren! (Netzwerk)");
    }).always(function () {
        $('#sv1FriendsMailLetterLoadingIndicator_' + chatLogin).hide();
        $('#sv1FriendsMailLetterSubmitBtn_' + chatLogin).prop("disabled", false);
    });
}

function handleFavoLetterAllowments(favoLetterAllowments) {
    for (favoLetterAllowment of favoLetterAllowments) {
        handleFavoAllowment(favoLetterAllowment);
    }
}

function handleOnlineLetterAllowments(onlineLetterAllowments) {
    for (onlineLetterAllowment of onlineLetterAllowments) {
        handleOnlineAllowment(onlineLetterAllowment);
    }
}

function handleSv1FriendsLetterAllowments(sv1FriendsLetterAllowments) {
    for (sv1FriendsLetterAllowment of sv1FriendsLetterAllowments) {
        handleSv1FriendsLetterAllowment(sv1FriendsLetterAllowment);
    }
}

var friendsLetterallowments = [];

function handleSv1FriendsLetterAllowment(sv1FriendsLetterAllowment) {
    friendsLetterallowments[sv1FriendsLetterAllowment.chatLoginId] = sv1FriendsLetterAllowment;
    var sv1FriendsTextContainer = $("#sv1FriendsLetterTextContainer_" + sv1FriendsLetterAllowment.chatLoginId);
    var availTextCnt = sv1FriendsTextContainer.find("> div").length;
    var textCountDiv = sv1FriendsLetterAllowment.countRequiredTexts - availTextCnt;
    if (textCountDiv > 0) {
        for (var i = 0; i < textCountDiv; i++) {
            sv1FriendsTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + i + 1) + '</b></h6><textarea id="sv1Friends_text' + (availTextCnt + i) + '_' + sv1FriendsLetterAllowment.chatLoginId + '" name="text[' + (availTextCnt + i) + ']" style="flex-grow: 1;"onKeyUp="sv1FriendsLetter_validate_' + sv1FriendsLetterAllowment.chatLoginId + '();"></textarea></div></div>');
        }
    }

    var container = $('#sv1FriendsLetterItemContainer_' + sv1FriendsLetterAllowment.chatLoginId);
    var accordionItem = $('#sv1FriendsLetterAccordionItem_' + sv1FriendsLetterAllowment.chatLoginId);
    var currentState = sv1FriendsLetterAllowment.currentState;
    container.empty();
    if (currentState == 'ALLOWED') {
        var a = getSv1FriednsLetterButton(sv1FriendsLetterAllowment.chatLoginId);
        container.append(a);
        accordionItem.show();
    } else if (currentState == 'RUNNING') {
        container.append(getLetterProgressSpan(sv1FriendsLetterAllowment));
        accordionItem.show();
    } else if (currentState == 'NOT_ALLOWED') {
        accordionItem.hide();
        container.append('<span>Das Profil darf keine Anschreiben machen.</span>');
    } else if (currentState == 'ALREADY_RUNNING') {
        accordionItem.show();
        container.append('<span>Es läuft bereits ein Anschreiben</span>');
    } else {
        accordionItem.hide();
    }
}

function handleSv1DialogesLetterAllowments(sv1DialogesLetterAllowments) {
    for (sv1DialogesLetterAllowment of sv1DialogesLetterAllowments) {
        handleSv1DialogesLetterAllowment(sv1DialogesLetterAllowment);
    }
}

function addSv1FriendsLetterText(chatLoginId) {
    var sv1FriendsTextContainer = $("#sv1FriendsLetterTextContainer_" + chatLoginId);
    var availTextCnt = sv1FriendsTextContainer.find("> div").length;
    sv1FriendsTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + 1) + '</b></h6><textarea id="sv1Friends_text' + (availTextCnt) + '_' + sv1FriendsLetterAllowment.chatLoginId + '" name="text[' + (availTextCnt) + ']" style="flex-grow: 1;"onKeyUp="sv1FriendsLetter_validate_' + sv1FriendsLetterAllowment.chatLoginId + '();"></textarea></div></div>');
}

function removeSv1FriendsLetterText(chatLoginId) {
    var sv1FriendsTextContainer = $("#sv1FriendsLetterTextContainer_" + chatLoginId);
    var allowment = dialogesLetterallowments[chatLoginId];
    var availTextCnt = sv1FriendsTextContainer.find("> div").length;
    if (availTextCnt > allowment.countRequiredTexts) {
        sv1FriendsTextContainer.children().last().remove();
    }
}

function handleOnlineAllowment(onlineLetterAllowment) {
    var onlineTextContainer = $("#onlineLetterTextContainer_" + onlineLetterAllowment.chatLoginId);
    var availTextCnt = onlineTextContainer.find("> div").length;
    var textCountDiv = onlineLetterAllowment.countRequiredTexts - availTextCnt;
    if (textCountDiv > 0) {
        for (var i = 0; i < textCountDiv; i++) {
            onlineTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + i + 1) + '</b></h6><textarea id="online_text' + (availTextCnt + i) + '_' + onlineLetterAllowment.chatLoginId + '" name="text[' + (availTextCnt + i) + ']" style="flex-grow: 1;"onKeyUp="onlineLetter_validate_' + onlineLetterAllowment.chatLoginId + '();"></textarea></div></div>');
        }
    } else if (textCountDiv < 0) {
        for (var i = 0; i < (textCountDiv * -1); i++) {
            onlineTextContainer.children().last().remove();
        }
    }

    var container = $('#onlineLetterItemContainer_' + onlineLetterAllowment.chatLoginId);
    var accordionItem = $('#onlineLetterAccordionItem_' + onlineLetterAllowment.chatLoginId);
    var currentState = onlineLetterAllowment.currentState;
    container.empty();
    if (currentState == 'ALLOWED') {
        var a = getOnlineLetterButton(onlineLetterAllowment.chatLoginId);
        container.append(a);
        accordionItem.show();
    } else if (currentState == 'RUNNING') {
        container.append(getLetterProgressSpan(onlineLetterAllowment));
        accordionItem.show();
    } else if (currentState == 'ALREADY_SEND') {
        container.append('<span>Sie haben in der letzten Stunde bereits ein Anschreiben getätigt.</span>');
        if (onlineLetterAllowment.nextPosible) {
            container.append('<br><span>M&ouml;glich ab: ' + onlineLetterAllowment.nextPosible + ' </span>');
        }
        accordionItem.show();
    } else if (currentState == 'AWAIT_AUTHORISATION') {
        container.append('<span>Das Anschreiben wartet auf freigabe.</span>');
        accordionItem.show();
    } else if (currentState == 'NOT_ALLOWED') {
        accordionItem.hide();
        container.append('<span>Das Profil darf keine Anschreiben machen.</span>');
    } else if (currentState == 'ALREADY_RUNNING') {
        accordionItem.show();
        container.append('<span>Es läuft bereits ein Anschreiben</span>');
    } else {
        accordionItem.hide();
    }
}

function handleFavoAllowment(favoLetterAllowment) {
    var favoTextContainer = $("#favoLetterTextContainer_" + favoLetterAllowment.chatLoginId);
    var availTextCnt = favoTextContainer.find("> div").length;
    favoLetterallowments[favoLetterAllowment.chatLoginId] = favoLetterAllowment;
    var textCountDiv = favoLetterAllowment.countRequiredTexts - availTextCnt;
    if (textCountDiv > 0) {
        for (var i = 0; i < textCountDiv; i++) {
            favoTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + i + 1) + '</b></h6><textarea id="favo_text' + (availTextCnt + i) + '_' + favoLetterAllowment.chatLoginId + '" name="text[' + (availTextCnt + i) + ']" style="flex-grow: 1;"onKeyUp="favoLetter_validate_' + favoLetterAllowment.chatLoginId + '();"></textarea></div></div>');
        }
    }

    var container = $('#favouritesLetterItemContainer_' + favoLetterAllowment.chatLoginId);
    var accordionItem = $('#favouritesLetterAccordionItem_' + favoLetterAllowment.chatLoginId);
    var currentState = favoLetterAllowment.currentState;
    container.empty();
    if (currentState == 'ALLOWED') {
        var a = getFavoLetterButton(favoLetterAllowment.chatLoginId);
        container.append(a);
        accordionItem.show();
    } else if (currentState == 'RUNNING') {
        container.append(getLetterProgressSpan(favoLetterAllowment));
        accordionItem.show();
    } else if (currentState == 'ALREADY_SEND') {
        container.append('<span>Sie haben heute schon ein Anschreiben getätigt.</span>');
        if (favoLetterAllowment.nextPosible) {
            container.append('<br><span>M&ouml;glich ab: ' + favoLetterAllowment.nextPosible + ' </span>');
        }
        accordionItem.show();
    } else if (currentState == 'AWAIT_AUTHORISATION') {
        container.append('<span>Das Anschreiben wartet auf freigabe.</span>');
        accordionItem.show();
    } else if (currentState == 'NOT_ALLOWED') {
        accordionItem.hide();
        container.append('<span>Das Profil darf keine Anschreiben machen.</span>');
    } else if (currentState == 'ALREADY_RUNNING') {
        accordionItem.show();
        container.append('<span>Es läuft bereits ein Anschreiben</span>');
    } else {
        accordionItem.hide();
    }
}

function getLetterProgressSpan(letterAllowment) {
    var span = '<span>' + letterAllowment.doneCount + ' von ' + letterAllowment.completeCount + ' erledigt.</span>';
    return span;
}

function getSv1FriednsMailLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#sv1FriendsMailLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}

function getSv1FriednsLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#sv1FriendsLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}

function getOnlineLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#onlineLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}

function getFavoLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#favoLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}

function getSv1DialogesLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#sv1DialogesLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}

function modifyFavo(chatLoginId, customerName, customerId, add, button) {
    var btn = $(button);
    btn.prop("disabled", true);
    disableControlls(chatLoginId, true);
    var encodedCustomerId = encodeCustomerId(customerId);


    $.post("/api/ModifyFavourite", {
        chatLoginId: chatLoginId,
        customerName: customerName,
        customerId: customerId,
        add: add
    }).done(function (resp) {

        chatLoginInfos.get(chatLoginId + "").favoCount = resp.favoCount;
        userInfos[customerId].favo = add;
        setFavouritesCount(chatLoginId);

        handleDialog(resp.favoDialoges, 'favo');

        appendFavoModifyButton(chatLoginId, customerName, encodedCustomerId, customerId, false);
    }).fail(function () {
        alert("Server hat das " + (add ? "hinzufügen" : "entfernen") + " des Kunden als Favoriten nicht bestätigt. Bitte den Aktualisieren den Status des Kunden zu prüfen.");
    }).always(function () {
        disableControlls(chatLoginId, false);
        $(btn).prop('disabled', false);
    });
}

function handleOpenDialoges(openDialoges) {
    for (openDialog of openDialoges) {
        handleDialog(openDialog, "open");
    }
}

function handleFavoDialoges(favoDialoges) {
    for (favoDialoge of favoDialoges) {
        handleDialog(favoDialoge, "favo");
    }
}

function handleOnlineUserDialoge(onlineUserDialoges) {
    for (onlineUserDialoge of onlineUserDialoges) {
        handleDialog(onlineUserDialoge, "came_online");
    }
}

function handleVisitorDialoges(visitorDialoges) {
    for (visitorDialoge of visitorDialoges) {
        handleDialog(visitorDialoge, "visitor");
    }
}

function handleSliderData(sliderDialoges) {
    if (sliderDialoges) {
        Object.keys(sliderDialoges).forEach(key => {
            var value = sliderDialoges[key];
            renderSliderInfo(key, value);
        });
    }
}

function GetInfoParameter() {
    var parameter = "?";
    if (GetStartInfos) {
        parameter += "startInfos=true&";
    } else {
        parameter += "startInfos=false&";
    }
    parameter += "isFirstInfoMsg=" + isFirstInfoMsg + "&";
    isFirstInfoMsg = false;
    return parameter;
}

function handleStartInfo(startInfo) {
    for (chatLoginInfo of startInfo.chatLoginInfos) {
        var chatLoginId = chatLoginInfo.chatLoginId;
        var containerId = "messangerContainer_" + chatLoginId;
        var chatLoginName = chatLoginInfo.chatLoginName;
        chatLoginInfos.set(chatLoginId + "", chatLoginInfo);
        chatLoginNames[chatLoginId] = chatLoginName;
        chatLoginAlias[chatLoginId] = chatLoginInfo.alias;
        getOrCreateMessageContainer(containerId, chatLoginId);
        chatLoginInfoRender(chatLoginInfo);
        setFavouritesCount(chatLoginId);
        $("#chatLoginName_" + chatLoginId + "-tab").empty();
        $("#chatLoginName_" + chatLoginId + "-tab").append(chatLoginName);
    }
}

function renderSliderInfo(chatLoginId, dialoges) {
    var container = $("#slider_" + chatLoginId);
    container.empty();

    for (dialog of dialoges) {
        if (dialog.id == "profile") {
            container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-profile-item\">" + dialog.nickname + "<br><span>Besucht dein Profil</span></li>");
        } else if (dialog.id == "buddyconfirm") {
            container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-friend-item\">" + dialog.nickname + "<br><span>ist jetzt dein Freund</span></li>");
        } else if (dialog.id == "buypicture") {
            container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-buy-item\">" + dialog.nickname + "<br><span>kauft ein Bild von dir</span></li>");
            handleBuyerSlider(chatLoginId, dialog, false);
        } else if (dialog.id == "buymovie") {
            container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-buy-item\">" + dialog.nickname + "<br><span>kauft ein Video von dir</span></li>");
            handleBuyerSlider(chatLoginId, dialog, true);
        } else if (dialog.id == "online") {
            if (dialog.buddy) {
                container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-friend-item\">" + dialog.nickname + "<br><span>Freund geht online</span></li>");
            } else {
                container.append("<li onClick=\"loadDialog(" + chatLoginId + ",'" + dialog.productId + "@" + dialog.userId + "','" + dialog.nickname + "');\" class=\"slider-client-item\">" + dialog.nickname + "<br><span>Kunde geht online</span></li>");
            }
        }
    }
    $("#messangerContainer_" + chatLoginId + " .ac-slider-container").scrollLeft(0);
}

function handleBuyerSlider(chatLoginId, dialog, isMovie) {
    var customerId = dialog.productId + "@" + dialog.userId;
    var liId = chatLoginId + '_buyer_dialog_' + encodeCustomerId(customerId) + "_" + dialog.timestamp;
    var li = $('#' + liId);
    if (li.length == 0) {
        var container = $('#buyedsItemContainer_' + chatLoginId);
        li = getBuyerLi(chatLoginId, customerId, dialog.nickname, dialog.timestamp, isMovie);
        container.append(li);
        container.find('li').get().sort(function (a, b) {
            var liA = $(a);
            var liB = $(b);
            var aTime = liA.data('time');
            var bTime = liB.data('time');

            return bTime - aTime;
        });
        setBuyerCount(chatLoginId, container.find('li').length);
    }
}

function messangerTabClicked(chatLoginId) {
    setTimeout(function () {
        $("#mod_message_" + chatLoginId).focus();
        var msgHistory = $("#messageHistory_" + chatLoginId);
        msgHistory.scrollTop(msgHistory.prop("scrollHeight"));
    }, 500);

}

function getOrCreateMessageContainer(containerId, chatLoginId) {
    var container = $("#" + containerId);
    if (container.length == 0 && chatLoginNames[chatLoginId] && chatLoginNames[chatLoginId] !== undefined) {
        var chatLoginName = chatLoginNames[chatLoginId];
        var firstChild = $("#messagerContainer").children().length == 0;
        var containerButtonString = '<li class="nav-item" role="presentation" data-chatlogin-id="' + chatLoginId + '"><button onclick="messangerTabClicked(' + chatLoginId + ');" class="messanger_tab_button nav-link ' + (firstChild ? 'active' : '') + '" id="'
            + containerId
            + '-tab" data-bs-toggle="tab" data-bs-target="#'
            + containerId
            + '" type="button" role="tab" aria-controls="'
            + containerId
            + '" aria-selected="'
            + (firstChild ? 'true' : 'false')
            + '"><span id="chatLoginName_' + chatLoginId + '-tab">'
            + chatLoginName
            + '</span> (<span id="count_' + chatLoginId + '">0</span>)'
            + (chatLoginAlias[chatLoginId] ? '<br><span style="font-size: 14px;">(' + chatLoginAlias[chatLoginId] + ')</span>' : '')
            + '</button></li>';
        var profilSelectionContainer = $("#profilSelection");
        profilSelectionContainer.append(containerButtonString);
        if (!firstChild) {
            var lis = profilSelectionContainer.find("li").get();
            lis.sort(comparerContainerLi());
            $.each(lis, function (i, li) {
                profilSelectionContainer.append(li);
            });
        }
        var templateId = "#messangerTemplate";
        container = $(templateId).clone().html().replaceAll("___chatLoginId___", chatLoginId);

        $("#messagerContainer").append(container);
        container = $("#" + containerId);
        container.css("display", "");
        if (firstChild) {
            container.addClass("show active");
        }
        const chatType = chatLoginInfos.get(chatLoginId + "").chatType;
        if (chatType == 'MDH') {
            $('#newUserOverview_' + chatLoginId).show();
        }
        if (chatType == 'LC' || chatType == 'MDH') {
            $('#dialogOverview_' + chatLoginId).show();
            $('#buddyRequests_' + chatLoginId).show();
        }
    }
    return container;
}

function chatLoginInfoRender(chatLoginInfo) {
    var chatLoginId = chatLoginInfo.chatLoginId;
    var chatLoginName = chatLoginInfo.chatLoginName

    var chatLoginInfoContainer = $("#chatLoginInfos_" + chatLoginId);
    chatLoginInfoContainer.empty();

    var container = $("#chatLoginInfosTemplate").clone().html().replaceAll("___chatloginId___", chatLoginId);
    chatLoginInfoContainer.append(container);
    $("#chatLoginName_" + chatLoginId).text(chatLoginName);
    //TODO $("#chatLoginImages_" + chatLoginId + "_" + encodedCustomerId).append("<img class=\"hideableImage\" src=\"" + userInfo.imageUrl + "\" style=\"height:100px;\"/>");

    var profilInfos = "<dl class=\"row\" style=\"width:100%;\">";
    for (profilInfoKey in chatLoginInfo.profilInfos) {
        profilInfos += "<dt class=\"col-sm-6\">" + profilInfoKey + "</dt><dd class=\"col-sm-6\">" + chatLoginInfo.profilInfos[profilInfoKey] + "</dd>";
    }
    profilInfos += "</dl>"
    $("#chatLoginInfos_" + chatLoginId).append(profilInfos);


    var profilPreferences = "<dl >";
    for (profilPreferencesKey in chatLoginInfo.profilPreferences) {
        profilPreferences += "<dt>" + profilPreferencesKey + "</dt><dd><ul class=\"profil-preference-list-group\">";

        for (profilPreferenceItem of chatLoginInfo.profilPreferences[profilPreferencesKey]) {
            profilPreferences += "<li class=\"profil-preference-list-group-item\">" + profilPreferenceItem + "</li>";
        }
        profilPreferences += "</ul></dd>";
    }
    profilPreferences += "</dl>"
    $("#chatLoginPreferences_" + chatLoginId).append(profilPreferences);

    var freeTexts = "<dl >";
    for (freeTextKey in chatLoginInfo.freeTexts) {
        freeTexts += "<dt>" + freeTextKey + "</dt><dd>" + chatLoginInfo.freeTexts[freeTextKey] + "</dd>";
    }
    freeTexts += "</dl>"
    $("#chatLoginFreeTexts_" + chatLoginId).append(freeTexts);

}

function comparerContainerLi() {
    return function (a, b) {
        var liA = $(a);
        var liB = $(b);
        var a = liA.find("button").text();
        var b = liB.find("button").text();
        return a.localeCompare(b);
    };
};

function zoomSliderMoved(messageContainerChildIndex, input) {
    var a = $("#messagerContainer");
    var b = a.find("[data-childId='" + messageContainerChildIndex + "']");
    b.css('font-size', input.value + '%');
}

function handleProblem(problem) {
    switch (problem.type) {
        case 'chat_connection_lost':
            setError('/images/warning.svg', problem);
            break;
        case 'chat_connect':
            setError('/images/error.svg', problem);
            break;
        case 'inactivity':
            setError('/images/sleep.svg', problem);
            break;
        case 'clear':
            setError('/images/checked.svg', problem);
            break;
        case 'load_message':
            chatLoginInfos.forEach(function (value, key) {
                disableControlls(key, false);
            });
            alert(problem.text);
            break;
    }
}

function setError(iconPath, problem) {
    var img = $("#stateIcon");
    img.attr('title', problem.text);
    img.attr('src', iconPath);
}

function handleDialog(data, type) {
    var chatLoginId = data.chatLoginId;
    var containerId = "messangerContainer_" + chatLoginId;
    var container = getOrCreateMessageContainer(containerId, chatLoginId);
    if (type == "favo") {
        $("#favouritesDialogesItemContainer_" + chatLoginId).empty();
        createNewFavouriteDialoges(chatLoginId, data);
        setFavouritesCount(chatLoginId)
    } else if (type == "open") {
        var openDialogsContainer = $("#openDialogesItemContainer_" + chatLoginId);
        var emptyOpenDialoges = openDialogsContainer.find("li").length == 0;
        var noDialogLoaded = $("#messagesContainer_" + chatLoginId).attr('data-loaded') == 'false';

        createNewOpenDialoges(chatLoginId, data);
        setOpenDialogesCount(chatLoginId, openDialogsContainer.find("li").length);
        if (emptyOpenDialoges && noDialogLoaded && autoOpen) {
            loadNextDialog(openDialogsContainer, chatLoginId);
        }
    } else if (type == "visitor") {
        var visitorDialogsContainer = $("#visitorDialogesItemContainer_" + chatLoginId);
        createNewVisitorDialoges(chatLoginId, data);
        setVisitorDialogesCount(chatLoginId, visitorDialogsContainer.find("li").length);
    } else if (type == "came_online") {
        var onlineUserDialogesItemContainer = $("#onlineUserDialogesItemContainer_" + chatLoginId);
        createNewOnlineUserDialoges(chatLoginId, data);
        setOnlineDialogesCount(chatLoginId, onlineUserDialogesItemContainer.find("li").length);
    } else if (type == "dialogesOverview") {
        createNewDialogesOverviewDialoges(chatLoginId, data);
    } else if (type == "newUserOverview") {
        createNewUserOverviewDialoges(chatLoginId, data);
    } else if (type == "friends") {
        createNewDialogesFriends(chatLoginId, data);
    }
    container.removeAttr("style");
}

function createNewDialogesFriends(chatLoginId, data) {
    var liContainer = $('#buddyRequestsDialogesItemContainer_' + chatLoginId);
    liContainer.empty();
    for (dialog of data.friends) {
        var customerId = dialog.customerId;
        var customerName = dialog.customerName;
        liContainer.append(getFriendLi(chatLoginId, customerId, customerName));
    }
}

function createNewDialogesOverviewDialoges(chatLoginId, data) {
    var liContainer = $('#dialogOverviewDialogesItemContainer_' + chatLoginId);
    liContainer.empty();
    for (dialog of data.dialoges) {
        var customerId = dialog.customerId;
        var customerName = dialog.customerName;
        var time = dialog.lastSendSecond;
        var isOnline = dialog.online;
        liContainer.append(getDialogOverviewLi(chatLoginId, customerId, customerName, time, isOnline));
    }
}

function createNewUserOverviewDialoges(chatLoginId, data) {
    var liContainer = $('#newUserOverviewDialogesItemContainer_' + chatLoginId);
    liContainer.empty();
    for (dialog of data.dialoges) {
        var customerId = dialog.customerId;
        var customerName = dialog.customerName;
        var isOnline = dialog.online;
        liContainer.append(getNewUserOverviewLi(chatLoginId, customerId, customerName, isOnline));
    }
}


function createNewVisitorDialoges(chatLoginId, visitors) {
    var visitorsContainer = $("#visitorDialogesItemContainer_" + chatLoginId);

    for (visitorDialog of visitors.dialoges) {
        var customerId = visitorDialog.dialog.customerId;
        var customerName = visitorDialog.dialog.cutomerName;
        var time = visitorDialog.dialog.time;

        if ($("#" + chatLoginId + '_visitors_dialog_' + encodeCustomerId(customerId)).length == 0) {
            visitorsContainer.append(getVisitorsLi(chatLoginId, customerId, customerName, time, visitorDialog.online));
        }
    }
    if (chatLoginInfos.get(chatLoginId + "").chatType != 'MDH') {
        var lis = visitorsContainer.find("li").get();
        lis.sort(function (a, b) {
            var liA = $(a);
            var liB = $(b);
            var aText = liA.find("button").text();
            var bText = liB.find("button").text();
            var timeAText = aText.substring(aText.lastIndexOf('(') + 1, aText.lastIndexOf(')'));
            var timeBText = bText.substring(bText.lastIndexOf('(') + 1, bText.lastIndexOf(')'));

            var timeA = convertToDate(timeAText);
            var timeB = convertToDate(timeBText);

            return timeB - timeA;

        });
    }
    $.each(lis, function (i, li) {
        visitorsContainer.append(li);
    });
}

function createNewOnlineUserDialoges(chatLoginId, onlineUsers) {
    var onlineUserDialogesItemContainer = $("#onlineUserDialogesItemContainer_" + chatLoginId);

    for (onlineUserDialog of onlineUsers.dialoges) {
        var customerId = onlineUserDialog.dialog.customerId;
        var customerName = onlineUserDialog.dialog.cutomerName;
        var time = onlineUserDialog.dialog.time;

        if ($("#" + chatLoginId + '_online_user_dialog_' + encodeCustomerId(customerId)).length == 0) {
            onlineUserDialogesItemContainer.append(getOnlineUsersLi(chatLoginId, customerId, customerName, time, onlineUserDialog.online));
        }
    }

    var lis = onlineUserDialogesItemContainer.find("li").get();
    lis.sort(function (a, b) {
        var liA = $(a);
        var liB = $(b);
        var aText = liA.find("button").text();
        var bText = liB.find("button").text();
        var timeAText = aText.substring(aText.lastIndexOf('(') + 1, aText.lastIndexOf(')'));
        var timeBText = bText.substring(bText.lastIndexOf('(') + 1, bText.lastIndexOf(')'));

        var timeA = convertToDate(timeAText);
        var timeB = convertToDate(timeBText);

        return timeB - timeA;

    });
    $.each(lis, function (i, li) {
        onlineUserDialogesItemContainer.append(li);
    });
}

function convertToDate(dateString) {
    var reggie = /(\d{2})\.(\d{2})\.(\d{4}) - (\d{2}):(\d{2})/;
    var dateArray = reggie.exec(dateString);
    return new Date(
        (+dateArray[3]),
        (+dateArray[2]) - 1, // Careful, month starts at 0!
        (+dateArray[1]),
        (+dateArray[4]),
        (+dateArray[5]),
        0
    );
}

function createNewFavouriteDialoges(chatLoginId, favourites) {
    var favouritesContainer = $("#favouritesDialogesItemContainer_" + chatLoginId);

    for (newDialog of favourites.dialoges) {
        var customerId = newDialog.dialog.customerId;
        var customerName = newDialog.dialog.cutomerName;

        if ($("#" + chatLoginId + '_favourites_dialog_' + encodeCustomerId(customerId)).length == 0) {
            favouritesContainer.append(getFavouritesLi(chatLoginId, customerId, customerName, newDialog.online));
        }
    }
}

function createNewOpenDialoges(chatLoginId, openDialog) {
    var openDialogsContainer = $("#openDialogesItemContainer_" + chatLoginId);

    for (newDialog of openDialog.dialoges) {
        var customerId = newDialog.dialog.customerId;
        var customerName = newDialog.dialog.cutomerName;
        var newDialogLastSendTimeInSeconds = newDialog.dialog.lastSendTimeSeconds;

        userInfos[customerId] = newDialog.userInfo;

        if ($("#" + chatLoginId + '_open_dialog_' + encodeCustomerId(customerId)).length == 0) {
            var newLi = getOpenDialogLi(chatLoginId, customerId, customerName, newDialogLastSendTimeInSeconds, newDialog.online);
            var lis = openDialogsContainer.find("li");
            if (lis.length == 0) {
                openDialogsContainer.append(newLi);
            } else {
                var added = false;
                lis.each(function () {
                    var timeInSeconds = $(this).attr("data-last-send-time-in-seconds");
                    if (newDialogLastSendTimeInSeconds > timeInSeconds) {
                        $(this).before(newLi);
                        added = true;
                        return false;
                    }
                });
                if (added == false) {
                    openDialogsContainer.append(newLi);
                }
            }

        }
    }
}

function getOnlineSpan(isOnline, style = undefined) {
    var onlineSpan = "<span class=\"dot offline-dot\" style=\"" + (style ? style : '') + "\"></span>";
    if (isOnline) {
        onlineSpan = "<span class=\"dot online-dot\" style=\"" + (style ? style : '') + "\"></span>";
    }
    return onlineSpan;
}

function getBuyerLi(chatLoginId, customerId, customerName, time, isMovie) {
    var image;
    if (isMovie) {
        image = '<img src=\"/images/movie.svg\" style="width: 20px; margin-right: 5px;">';
    } else {
        image = '<img src=\"/images/picture.svg\" style="width: 20px; margin-right: 5px;">';
    }
    return '<li id="' + chatLoginId + '_buyer_dialog_' + encodeCustomerId(customerId) + '_' + time + '" data-time="' + time + '">' + '<button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + image + customerName + " (" + getDateTimeMillisString(time) + ")</button></li>";
}

function getVisitorsLi(chatLoginId, customerId, customerName, time, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline);
    return '<li id="' + chatLoginId + '_visitors_dialog_' + encodeCustomerId(customerId) + '">' + onlineSpan + '<button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + " (" + time + ")</button></li>";
}

function getOnlineUsersLi(chatLoginId, customerId, customerName, time, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline);
    return '<li id="' + chatLoginId + '_online_user_dialog_' + encodeCustomerId(customerId) + '">' + onlineSpan + '<button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + " (" + time + ")</button></li>";
}

function getFriendLi(chatLoginId, customerId, customerName) {
    return '<li id="' + chatLoginId + '_dialogesOverview_dialog_' + encodeCustomerId(customerId) + '"></button><button onclick="modifyBuddy(' + chatLoginId + ',\'' + customerId + '\',true)" class="btn btn-success"style="width: 30px; padding: 3px; margin-right: 10px"><img style="width: 100%;" src="/images/thumb_up.svg"></button><button class="btn btn-danger" style="width: 30px; padding: 3px;" onclick="modifyBuddy(' + chatLoginId + ',\'' + customerId + '\',false)"><img style="width: 100%;" src="/images/thumb_down.svg"></button><button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + '</li>';
}

function getDialogOverviewLi(chatLoginId, customerId, customerName, time, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline, "float: left;margin-top: 15px;");
    return '<li id="' + chatLoginId + '_dialogesOverview_dialog_' + encodeCustomerId(customerId) + '"><div>' + onlineSpan + '<button class="btn dialog-overview-btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + " (" + getDateTimeString(time, false) + ")</button>" +
        (acDeleteConversationsAllowed ? '<button class="btn btn-primary delete-dialog-overview-btn" onClick="deleteOverviewDialog(\'' + chatLoginId + '\',\'' + customerId + '\');"><img src=\"/images/trash.svg\"></button>' : '') + '</div></li>';
}

function getNewUserOverviewLi(chatLoginId, customerId, customerName, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline);
    return '<li id="' + chatLoginId + '_newUserOverview_dialog_' + encodeCustomerId(customerId) + '">' + onlineSpan + '<button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + "</button></li>";
}


function getFavouritesLi(chatLoginId, customerId, customerName, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline);
    return '<li id="' + chatLoginId + '_favourites_dialog_' + encodeCustomerId(customerId) + '">' + onlineSpan + '<button class="btn" onClick="loadDialog(\'' + chatLoginId + '\',\'' + customerId + '\',\'' + customerName + '\');">' + customerName + "</button></li>";
}

function getOpenDialogLi(chatLoginId, customerId, customerName, lastSendTime = 0, isOnline) {
    var onlineSpan = getOnlineSpan(isOnline);
    return '<li id="' + chatLoginId + '_open_dialog_' + encodeCustomerId(customerId) + '" data-last-send-time-in-seconds="' + lastSendTime + '">' + onlineSpan + '<button class="btn" onClick="loadMessagesForOpenDialog(\'' + chatLoginId + '\',\'' + customerId + '\',true);">' + customerName + "</button></li>";
}

function deleteOverviewDialog(chatLoginId, customerId) {
    disableControlls(chatLoginId, true);
    $.post("/api/messanger/ac/deleteConversation/" + chatLoginId + "/" + customerId)
        .done(function () {
            var overviewSelect = $('#dialogOverviewSelect_' + chatLoginId);
            var start = overviewSelect.attr('data-currentstart');
            if ($("#dialogOverviewDialogesItemContainer_" + chatLoginId).find("li").length <= 1) {
                start = start - 1;
            }
            loadDialogOverview(chatLoginId, {value: start});
        }).fail(function () {
        alert("Fehler. Bitte Aktualisieren.");
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function modifyBuddy(chatLoginId, customerId, accepted) {
    disableControlls(chatLoginId, true);
    var modifyType = accepted ? "accept" : "decline";
    $.post("api/messanger/ac/" + modifyType + "/" + chatLoginId + "/" + customerId)
        .done(function () {
        }).fail(function () {
        alert("Fehler. Bitte Aktualisieren.");
    }).always(function () {
        disableControlls(chatLoginId, false);
        loadBuddyRequests(chatLoginId);
    });
}

function loadDialog(chatLoginId, customerId, customerName) {
    disableControlls(chatLoginId, true);
    var customerContainer = $("#customer_" + chatLoginId + "_container");
    customerContainer.empty();
    emptyMessageContainer(chatLoginId);

    $.get("api/loadDialog/" + chatLoginId + "/" + customerId, function (resp) {
        userInfos[customerId] = resp.userInfo;
        emptyMessageContainer(chatLoginId);
        showCustomerProfil(chatLoginId, customerId, customerName);
        handleMessageforDialog(resp.messages);
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function setTabCount(chatLoginId, count) {
    $("#count_" + chatLoginId).empty();
    $("#count_" + chatLoginId).append(count);
    var li = $("#count_" + chatLoginId).closest('li');
    if (count > 0) {
        if (!li.hasClass('blink_me_new')) {
            li.addClass('blink_me_new');
        }
    } else {
        if (li.hasClass('blink_me_new')) {
            li.removeClass('blink_me_new');
        }
    }
}

function setOpenDialogesCount(chatLoginId, count) {
    setTabCount(chatLoginId, count);
    $("#countOpenDialogs_" + chatLoginId).empty();
    $("#countOpenDialogs_" + chatLoginId).append(count);
}

function setVisitorDialogesCount(chatLoginId, count) {
    $("#countVisitors_" + chatLoginId).empty();
    $("#countVisitors_" + chatLoginId).append(count);
}

function setOnlineDialogesCount(chatLoginId, count) {
    $("#countOnlineUserDialoges_" + chatLoginId).empty();
    $("#countOnlineUserDialoges_" + chatLoginId).append(count);
}

function setBuyerCount(chatLoginId, count) {
    $("#countBuyed_" + chatLoginId).empty();
    $("#countBuyed_" + chatLoginId).append(count);
}


function setFavouritesCount(chatLoginId) {
    $("#countFavourites_" + chatLoginId).empty();
    $("#countFavourites_" + chatLoginId).append(chatLoginInfos.get(chatLoginId + "").favoCount);
}

function encodeCustomerId(customerId) {
    return customerId.replace('@', '-');
}

function decodeCustomerId(customerId) {
    return customerId.replace('-', '@');
}

function loadMessagesForOpenDialog(chatLoginId, customerId, removeDialogEnabled = false) {
    disableControlls(chatLoginId, true);

    var customerName = $("#" + chatLoginId + '_open_dialog_' + encodeCustomerId(customerId) + ' button').text();
    showCustomerProfil(chatLoginId, customerId, customerName);

    emptyMessageContainer(chatLoginId);

    $.get("api/loadMessages/" + chatLoginId + "/" + customerId, function (resp) {
        handleMessageforDialog(resp, removeDialogEnabled);
    }).fail(function () {
        alert("Problem beim laden der Nachrichten für den Dialog.");
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function handleMessageforDialog(msgResponse, removeDialogEnabled = false) {
    if (msgResponse.problem != null) {
        handleProblem(msgResponse.problem);
    } else {
        var chatLoginId = msgResponse.chatLoginId;
        var customerId = msgResponse.dialogInfo.id.customerId;

        var messages = "<div id=\"messageHistory_" + chatLoginId + "\" class=\"history\" style=\"overflow: auto;flex: 1 1 auto;height: 100%;border: 1px solid rgba(0,0,0,.125);margin-top: 5px;\">";
        var lastOwnMessage = false;
        var countCustomerMsgs = 0;
        for (message of msgResponse.messages) {
            var messageSenderId = null;
            if (message.sender != null) {
                if (chatLoginInfos.get(chatLoginId + "").chatType != 'FRIVOL') {
                    messageSenderId = message.sender.productId + "@" + message.sender.userId;
                } else {
                    messageSenderId = message.sender.userId;
                }
            }

            var timeString = " schrieb am " + getDateTimeString(message.time);
            var attachement = "";
            var ownMessagePlus = "";
            var regard = "";
            if (message.attachment) {
                var attUrl = message.attachment.url;
                if (!attUrl.startsWith('http')) {
                    attUrl = "https://c2.ac-data.com" + attUrl;
                }
                attachement = "<br><a href=\"" + attUrl + "\" target=\"_blank\">" + message.attachment.name + "</a>";
            }
            if (message.payload.type == 'kiss') {
                ownMessagePlus = "<img src=\"https://c1.ac-data.com/resources/global/kiss.true.png\"><br>Ich küsse dich!";
            }
            if (message.payload.type == 'match') {
                ownMessagePlus = "<span style=\"font-weight: bold; color: red;\">Ihr seid ein Match!</span>";
            }
            if (message.payload.type == 'regard') {
                regard = "<span style=\"font-weight: bold; color: red;\">Du hast eine Aufmerksamkeit bekommen!</span><br><img src=\"https://c1.ac-data.com" + message.payload.image + "\"><br><span>Coins: " + message.payload.price + "</span><br>";
            }
            if (message.payload.type == 'sexicon') {
                regard = "<span style=\"font-weight: bold; color: red;\">" + message.payload.text + "</span><br><img src=\"https://c1.ac-data.com" + message.payload.image + "\">";
            }

            if (messageSenderId == null) {
                messages += "<p><span>!!!!!Unbekannt!!!!!!" + timeString + "</span><br>" + regard + message.body + attachement + ownMessagePlus + "</p><br>"
            } else if (messageSenderId == customerId) {
                messages += "<p><span>" + $("#customerName_" + chatLoginId + "_" + encodeCustomerId(msgResponse.dialogInfo.id.customerId)).text() + timeString + "</span><br>" + regard + message.body + attachement + ownMessagePlus + "</p><br>";
                lastOwnMessage = false;
                if (message.payload.type != 'kiss') {
                    countCustomerMsgs++;
                }
            } else {
                messages += "<p class=\"ownMessage\"><span>" + chatLoginNames[chatLoginId] + timeString + "</span><br>" + message.body + attachement + ownMessagePlus + "</p><br>"
                lastOwnMessage = true;
            }
        }

        if (countCustomerMsgs > 3) {
            $("#customerFavoControlls_" + chatLoginId + "_" + encodeCustomerId(customerId)).find('.btn-success').prop('disabled', false);
        }


        messages += "</div>";

        var writeHtml = "";

        if (removeDialogEnabled && lastOwnMessage) {
            writeHtml += "<div style=\"margin: 10px;flex: 1 0 auto;min-height: 30px;display:flex;\"><button id=\"mod_message_remove_button_" + chatLoginId + "\" style=\"float: left;width:100%;\" class=\"btn btn-danger\" onClick=\"removeDialog(" + chatLoginId + ", '" + customerId + "')\">Dialog Schließen</button></div>";
        }

        writeHtml += "<div style=\"flex: 1 0 auto;min-height: 60px;display:flex;\"><textarea id=\"mod_message_" + chatLoginId + "\" style=\"float: left;width: 100%\" onkeydown=\"sendMessageByKey(event,this," + chatLoginId + ", '" + customerId + "');\" onkeyup=\"checkMessageText(this," + chatLoginId + ")\">";
        writeHtml += "</textarea><button id=\"mod_message_send_button_" + chatLoginId + "\" style=\"float: left;\" class=\"btn btn-primary\" onClick=\"sendMessage(" + chatLoginId + ", '" + customerId + "');\" disabled>Senden</button></div>";

        var dialogNotes = "<div class=\"row\" style=\"white-space: pre;overflow: visible;border: 1px solid rgba(0,0,0,.125);\"><h5 class=\"messanger-note-heading\" >Notizen</h5><textarea id=\"" + chatLoginId + "_dialognotes\" style=\"min-height: 80px;\">" + msgResponse.dialogInfo.note + "</textarea></div>";

        var attachmentAccordionStart = "<div class=\"accordion\" id=\"collapseAttachmentAccordion_" + chatLoginId + "\" style=\"min-height: 54px;\"><div class=\"accordion-item\"><h2 id=\"collapseAttachmentHeader_" + chatLoginId + "\" class=\"accordion-header\">" +
            "<button class=\"accordion-button collapsed\" type=\"button\" data-bs-toggle=\"collapse\" data-bs-target=\"#collapseAttachment_" + chatLoginId + "\" aria-expanded=\"false\" aria-controls=\"collapseOne\">" +
            "<span>Anhänge</span>" +
            "</button></h2>" +
            "<div id=\"collapseAttachment_" + chatLoginId + "\"" +
            "	class=\"accordion-collapse collapse\"" +
            "	aria-labelledby=\"collapseAttachmentHeader_" + chatLoginId + "\"" +
            "	data-bs-parent=\"#collapseAttachmentAccordion_" + chatLoginId + "\">" +
            "   <div class=\"accordion-body\">";

        attachmentAccordionEnd = "</div></div></div></div>";

        var attachements = attachmentAccordionStart + "<div id=\"attachments_images_container_" + chatLoginId + "\" class=\"d-flex flex-wrap\" >";

        var images = chatLoginInfos.get(chatLoginId + "").images;
        if (images) {
            for (image of images) {
                if (image.file_url.endsWith(".mp4") || image.file_url.endsWith(".avi")) {
                    attachements += "<div class=\"attachement_image_container\"><img class=\"attachement_image\" src=\"/images/movie.svg\" onclick=\"attachementClicked($('#attachments_images_container_" + chatLoginId + "'),this)\" data-attachment-id=\"" + image.externalAttachmentId + "\"></div>";
                } else {
                    attachements += "<div class=\"attachement_image_container\"><img class=\"attachement_image\" src=\"" + image.file_url + "\" onclick=\"attachementClicked($('#attachments_images_container_" + chatLoginId + "'),this)\" data-attachment-id=\"" + image.externalAttachmentId + "\"></div>";
                }
            }
        }
        attachements += "</div>" + attachmentAccordionEnd;

        var chatLoginData = "<div class=\"row\" style=\"min-height:25px;text-align: center;\"><div style=\"min-height:25px;text-align: center;\"><span style=\"font-weight: bold;\">Name: </span> " + chatLoginInfos.get(chatLoginId + "").profileName + "<span style=\"font-weight: bold;margin-left: 5px;\">Beruf: </span> " + chatLoginInfos.get(chatLoginId + "").job + "<span style=\"font-weight: bold;margin-left: 5px;\">Geburtsdatum: </span> " + formateDate(chatLoginInfos.get(chatLoginId + "").birthDate) + "</div></div>"
            + ((chatLoginInfos.get(chatLoginId + "").adminNote && chatLoginInfos.get(chatLoginId + "").adminNote != "") ? "<div class=\"row\" style=\"border: 1px solid rgba(0,0,0,.125);margin-top: 5px;overflow: visible;\"><h5 style=\"background-color: lightcoral;text-align: center; text-decoration: underline;padding-bottom: 0.5rem;margin-bottom: 0;\">Adminnotizen</h2>" + chatLoginInfos.get(chatLoginId + "").adminNote + "</div>" : "");

        var messageContainer = $("#messagesContainer_" + chatLoginId);
        messageContainer.attr('data-loaded', 'true');
        messageContainer.append(chatLoginData + dialogNotes + messages + writeHtml + attachements);

        $("#mod_message_" + chatLoginId).focus();


        var d = $("#messageHistory_" + chatLoginId);
        d.scrollTop(d.prop("scrollHeight"));
    }
}

function checkMessageText(textarea, chatLoginId) {
    if (isMessageOk(textarea, chatLoginId)) {
        $("#mod_message_send_button_" + chatLoginId).prop("disabled", false);
        return true;
    } else {
        $("#mod_message_send_button_" + chatLoginId).prop("disabled", true);
        return false;
    }
}

function isMessageOk(textarea, chatLoginId) {
    var text = $(textarea).val().replace(/\s/g, '')
        .replace(':)', '')
        .replace(':-)', '')
        .replace(':-(', '')
        .replace(':*(', '')
        .replace(':*', '')
        .replace(':-*', '')
        .replace(';-*', '')
        .replace(';*', '')
        .replace(';)', '')
        .replace(';-)', '');
    if (text.length >= minTextLength && text.length >= chatLoginMinTextLength[chatLoginId] && !has3RepetedLetters(text)) {
        return true;
    } else {
        return false;
    }
}

function emotiClick(chatLoginId, div) {
    var emoti = ":" + $(div).attr("title") + ":";
    var tf = $("#mod_message_" + chatLoginId);
    insertTextInTF(tf, emoti)
}

function insertTextInTF(tf, insertText) {
    var curPos = tf[0].selectionStart;
    let text = tf.val();
    tf.val(text.slice(0, curPos) + insertText + text.slice(curPos));
}

function has3RepetedLetters(text) {
    var patt = /(.)\1\1\1\1/;
    var result = patt.test(text);
    return result;
}

function removeDialog(chatLoginId, customerId) {
    disableControlls(chatLoginId, true);
    $.post("api/removeDialog/" + chatLoginId + "/" + customerId)
        .done(function () {
            var openDialogsContainer = $("#openDialogesItemContainer_" + chatLoginId);
            var openDialogLi = $("#" + chatLoginId + "_open_dialog_" + encodeCustomerId(customerId));
            openDialogLi.remove();
            setOpenDialogesCount(chatLoginId, openDialogsContainer.find("li").length);
            loadNextDialog(openDialogsContainer, chatLoginId);
        }).fail(function () {
        alert("Fehler. Bitte Aktualisieren.");
    }).always(function () {
        disableControlls(chatLoginId, false);
    });
}

function loadNextDialog(openDialogsContainer, chatLoginId) {
    if (openDialogsContainer.find("li").length > 0) {
        var nextID = openDialogsContainer.find("li").first().attr('id');
        var nextCustomerId = decodeCustomerId(nextID.replace(chatLoginId + "_open_dialog_", ""));
        loadMessagesForOpenDialog(chatLoginId, nextCustomerId, true);
    } else {
        var customerContainer = $("#customer_" + chatLoginId + "_container");
        customerContainer.empty();
        emptyMessageContainer(chatLoginId);
    }
}

function emptyMessageContainer(chatLoginId) {
    var container = $("#messagesContainer_" + chatLoginId);
    container.empty();
    container.attr('data-loaded', 'false');
}

function attachementClicked(container, senderImg) {
    var preSelectedImage = container.find("img.selected-attachment");
    var preSelectedAttachmentId = null;
    var attchmentId = $(senderImg).attr("data-attachment-id");
    if (preSelectedImage && preSelectedImage.length > 0) {
        preSelectedAttachmentId = preSelectedImage.attr("data-attachment-id");
    }

    container.find("img").each(function () {
        $(this).removeClass("selected-attachment");
    });
    if (preSelectedAttachmentId == null || attchmentId != preSelectedAttachmentId) {
        $(senderImg).addClass("selected-attachment");
    }
}

function disableControlls(chatLoginId, disabled) {
    var openDialogsContainer = $("#openDialogesItemContainer_" + chatLoginId);
    openDialogsContainer.find("button").prop('disabled', disabled);
    var favouritesContainer = $("#favouritesItemContainer_" + chatLoginId);
    favouritesContainer.find("button").prop('disabled', disabled);
    $("#mod_message_" + chatLoginId).prop('disabled', disabled);
    if (!disabled) {
        if ($("#mod_message_" + chatLoginId).length > 0) {
            checkMessageText($("#mod_message_" + chatLoginId), chatLoginId);
        }
    } else {
        $("#mod_message_send_button_" + chatLoginId).prop("disabled", disabled);
    }
}

function showCustomerProfil(chatLoginId, customerId, customerName) {
    var userInfo = userInfos[customerId];
    var customerContainer = $("#customer_" + chatLoginId + "_container");
    customerContainer.empty();

    var encodedCustomerId = encodeCustomerId(customerId);
    var container = $("#customerInfosTemplate").clone().html().replaceAll("___chatloginId___", chatLoginId).replaceAll("___customerId___", encodedCustomerId);
    customerContainer.append(container);
    $("#customerName_" + chatLoginId + "_" + encodedCustomerId).text(customerName);
    if (userInfo.imageUrl) {
        $("#customerImages_" + chatLoginId + "_" + encodedCustomerId).append("<img class=\"hideableImage\" src=\"" + userInfo.imageUrl + "\" style=\"height:100px;\"/>");
    }

    appendFavoModifyButton(chatLoginId, customerName, encodedCustomerId, customerId);

    var profilInfos = "<dl class=\"row\">";
    for (profilInfoKey in userInfo.profilInfos) {
        profilInfos += "<dt class=\"col-sm-6\">" + profilInfoKey + "</dt><dd class=\"col-sm-6\">" + userInfo.profilInfos[profilInfoKey] + "</dd>";
    }
    profilInfos += "</dl>"
    $("#profilInfos_" + chatLoginId + "_" + encodedCustomerId).append(profilInfos);


    var profilPreferences = "<dl >";
    for (profilPreferencesKey in userInfo.profilPreferences) {
        profilPreferences += "<dt>" + profilPreferencesKey + "</dt><dd><ul class=\"profil-preference-list-group\">";

        for (profilPreferenceItem of userInfo.profilPreferences[profilPreferencesKey]) {
            profilPreferences += "<li class=\"profil-preference-list-group-item\">" + profilPreferenceItem + "</li>";
        }
        profilPreferences += "</ul></dd>";
    }
    profilPreferences += "</dl>"
    $("#profilPreferences_" + chatLoginId + "_" + encodedCustomerId).append(profilPreferences);

    var freeTexts = "<dl >";
    for (freeTextKey in userInfo.freeTexts) {
        freeTexts += "<dt>" + freeTextKey + "</dt><dd>" + userInfo.freeTexts[freeTextKey] + "</dd>";
    }
    freeTexts += "</dl>"
    $("#freeTexts_" + chatLoginId + "_" + encodedCustomerId).append(freeTexts);
}

function appendFavoModifyButton(chatLoginId, customerName, encodedCustomerId, customerId, disabled = true) {
    $("#customerFavoControlls_" + chatLoginId + "_" + encodedCustomerId).empty();
    $.get("api/messanger/is/favo/" + chatLoginId + "/" + customerId, function (resp) {
        if (resp === true) {
            $("#customerFavoControlls_" + chatLoginId + "_" + encodedCustomerId).append("<button class=\"btn btn-danger\" onClick=\"modifyFavo(" + chatLoginId + ", '" + customerName + "','" + customerId + "',false,this);\">Favorit löschen</button>");
        } else if (resp === false) {
            $("#customerFavoControlls_" + chatLoginId + "_" + encodedCustomerId).append("<button class=\"btn btn-success\" onClick=\"modifyFavo(" + chatLoginId + ", '" + customerName + "','" + customerId + "',true,this);\" " + (disabled ? 'disabled="true"' : '') + ">Favorit hinzufügen</button>");
        }
    });
}

function getDateTimeString(unix_timestamp, withSecounds = true) {
    return getDateTimeMillisString(unix_timestamp * 1000, withSecounds);
}

function getDateTimeMillisString(timestamp, withSecounds = true) {
    var date = new Date(timestamp);
    return formatNumber(date.getDate()) + "." + formatNumber(date.getMonth() + 1) + "." + date.getFullYear() + " " + formatNumber(date.getHours()) + ":" + formatNumber(date.getMinutes()) + (withSecounds ? (":" + formatNumber(date.getSeconds())) : '');
}

function formatNumber(number) {
    return number < 10 ? "0" + number : number;
}

function sendMessageByKey(keyevent, textarea, chatLoginId, customerId) {
    if (keyevent.keyCode == 13) {
        if (keyevent.altKey) {
            insertTextInTF($(textarea), '\r\n');
        } else if (isMessageOk(textarea, chatLoginId)) {
            sendMessage(chatLoginId, customerId);
        }
        keyevent.preventDefault();
    }
}

function sendMessage(chatLoginId, customerId) {
    var textArea = $("#mod_message_" + chatLoginId);
    if (checkMessageText(textArea, chatLoginId)) {
        var notesTextArea = $("#" + chatLoginId + "_dialognotes");
        if (textArea.val().includes("https://") || textArea.val().includes("http://") || textArea.val().includes("www.")) {
            alert("Sie dürfen keine Links verschicken!");
        } else if (textArea.val().trim().length > 0) {
            disableControlls(chatLoginId, true);
            var openDialogsContainer = $("#openDialogesItemContainer_" + chatLoginId);

            var attachmentId = findSelectedAttachmentId($("#attachments_images_container_" + chatLoginId));
            var customerName = $("#" + chatLoginId + "_open_dialog_" + encodeCustomerId(customerId) + " button").text();
            $.post("api/SendMessage", {
                chatLoginId: chatLoginId,
                customerId: customerId,
                message: textArea.val(),
                nickName: customerName,
                notes: notesTextArea.val(),
                attachmentId: attachmentId
            }).done(function (resp) {
                if (resp.success) {
                    textArea.val("");
                    var openDialogLi = $("#" + chatLoginId + "_open_dialog_" + encodeCustomerId(customerId));
                    openDialogLi.remove();
                    setOpenDialogesCount(chatLoginId, openDialogsContainer.find("li").length);
                    if (openDialogsContainer.find("li").length > 0 && autoOpen) {
                        var nextID = openDialogsContainer.find("li").first().attr('id');
                        var nextCustomerId = decodeCustomerId(nextID.replace(chatLoginId + "_open_dialog_", ""));
                        loadMessagesForOpenDialog(chatLoginId, nextCustomerId, true);
                    } else {
                        var customerContainer = $("#customer_" + chatLoginId + "_container");
                        customerContainer.empty();
                        emptyMessageContainer(chatLoginId);
                    }
                } else {
                    alert(resp.errorMessage);
                }
            }).fail(function () {
                alert("Server hat den Versand der Nachricht nicht bestätigt. Bitte den Dialog Aktualisieren um den Versand manuell zu prüfen.");
            }).always(function () {
                disableControlls(chatLoginId, false);
            });
        } else {
            alert("Kein Nachrichtentext.");
        }
    }
}

function findSelectedAttachmentId(container) {
    var selectedImage = container.find("img.selected-attachment");
    if (selectedImage.length == 0) {
        return null;
    } else {
        return selectedImage.attr("data-attachment-id");
    }
}

function toggleHideCustomerPictures() {
    if ($('#hideCustomerImages').is(':checked')) {
        $('body').addClass('hideCustomerImages');
    } else {
        $('body').removeClass('hideCustomerImages');
    }
}

let autoOpen = true;

function toggleAutoOpen(event) {
    event.preventDefault();
    if ($('#autoOpenCheck').is(':checked')) {
        autoOpen = true;
    } else {
        autoOpen = false;
    }
}

function toggleTabBlinking() {
    if (newTabBlinking) {
        newTabBlinking = false;
        $('body').removeClass('new-dialog-blinking');
        Cookies.set("new_dialog_blinking", 'false');
    } else {
        newTabBlinking = true;
        $('body').addClass('new-dialog-blinking');
        Cookies.set("new_dialog_blinking", 'true', {expires: 3650});
    }
    $("#newDialogBlinking").prop("checked", newTabBlinking);
}


function levenshtein(s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    var arr = [];
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                        arr[i - 1][j] + 1,
                        arr[i][j - 1] + 1,
                        arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                    );
        }
    }
    var levensteinDistance = arr[t.length][s.length];
    var longer = s;
    var shorter = t;
    if (s.length < t.length) {
        longer = t;
        shorter = s;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    } else {
        return (longerLength - levensteinDistance) / longerLength;
    }
}

function validateLetterTexts(container, submitBtn, minTextLength) {
    var childs = container.children();
    var disabled = false;
    var texts = []
    childs.each(function (index, element) {
        var textArea = $(element).find("textarea")
        var text = $(textArea).val().replace(/\s/g, '').toLowerCase();
        $(element).removeClass("text-error");
        if (text.length < letterMinTextLength || text.length < minTextLength || texts.includes(text)) {
            disabled = true;
            $(element).addClass("text-error");
            return false;
        }
        for (preText of texts) {
            if (levenshtein(text, preText) > levensteinMinimum) {
                disabled = true;
                $(element).addClass("text-error");
                return false;
            }
        }
        //last
        texts.push(text);

    });
    submitBtn.prop("disabled", disabled);
}

/*-----------------DIALOGES LETTER-----------*/
function sendSv1DialogesLetter(chatLogin) {
    var sv1DialogesTextContainer = $("#sv1DialogesLetterTextContainer_" + chatLogin);
    var requestObject = {};
    requestObject['chatLogin'] = chatLogin;
    requestObject['type'] = 'DIALOGES';
    requestObject['chatType'] = chatLoginInfos.get(chatLogin + "").chatType;
    if ($("#sv1DialogesReverse_" + chatLogin).length) {
        requestObject['boolData1'] = !$("#sv1DialogesReverse_" + chatLogin)[0].checked;
        requestObject['intData2'] = $("#sv1DialogesRecipientCnt_" + chatLogin).val();
    }
    sv1DialogesTextContainer.children().each(function (index, element) {
        requestObject['texts[' + index + ']'] = $(element).find('#sv1Dialoges_text' + index + '_' + chatLogin).val();
    });

    $('#sv1DialogesLetterSubmitBtn_' + chatLogin).prop("disabled", true);
    $('#sv1DialogesLetterLoadingIndicator_' + chatLogin).show();
    $.post("/api/letter/create", requestObject).done(function (resp) {
        if (resp.status == "OK") {
            handleSv1DialogesLetterAllowment(resp.allowmentDTO);
            $('#sv1DialogesLetterTextModal_' + chatLogin).modal('hide');
        } else if (resp.status == "INVALID_TEXTS") {
            handleTextErrors(sv1DialogesTextContainer, resp.validTextData)
        } else if (resp.status == "ERROR") {
            alert("Probleme beim versenden der Kundenrückgewinnung. Bitte aktualisieren! (Server)");
        }
    }).fail(function () {
        alert("Probleme beim versenden der Anschreiben. Bitte aktualisieren!");
    }).always(function () {
        $('#sv1DialogesLetterLoadingIndicator_' + chatLogin).hide();
        $('#sv1DialogesLetterSubmitBtn_' + chatLogin).prop("disabled", false);
    });
}

function handleSv1DialogesLetterAllowments(sv1DialogesLetterAllowments) {
    for (sv1DialogesLetterAllowment of sv1DialogesLetterAllowments) {
        handleSv1DialogesLetterAllowment(sv1DialogesLetterAllowment);
    }
}

var dialogesLetterallowments = [];

function handleSv1DialogesLetterAllowment(sv1DialogesLetterAllowment) {
    var chatLoginId = sv1DialogesLetterAllowment.chatLoginId;
    dialogesLetterallowments[chatLoginId] = sv1DialogesLetterAllowment;
    var sv1DialogesTextContainer = $("#sv1DialogesLetterTextContainer_" + chatLoginId);
    var availTextCnt = sv1DialogesTextContainer.find("> div").length;
    var textCountDiv = sv1DialogesLetterAllowment.countRequiredTexts - availTextCnt;
    if (textCountDiv > 0) {
        for (var i = 0; i < textCountDiv; i++) {
            sv1DialogesTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + i + 1) + '</b></h6><textarea id="sv1Dialoges_text' + (availTextCnt + i) + '_' + chatLoginId + '" name="text[' + (availTextCnt + i) + ']" style="flex-grow: 1;"onKeyUp="sv1DialogesLetter_validate_' + chatLoginId + '();"></textarea></div></div>');
        }
    }

    var container = $('#sv1DialogesLetterItemContainer_' + chatLoginId);
    var accordionItem = $('#sv1DialogesLetterAccordionItem_' + chatLoginId);
    var currentState = sv1DialogesLetterAllowment.currentState;
    container.empty();
    if (sv1DialogesLetterAllowment.lastSend) {
        container.append('<span>Gesendet am: ' + sv1DialogesLetterAllowment.lastSend + ' </span><br>');
    } else {
        container.append('<span>Gesendet am: Nie</span><br>');
    }

    if (chatLoginInfos.get(chatLoginId + "").chatType != 'LC') {
        accordionItem.hide();
    } else if (currentState == 'ALLOWED') {
        var a = getSv1DialogesLetterButton(chatLoginId);
        container.append(a);
        accordionItem.show();
    } else if (currentState == 'RUNNING') {
        container.append(getLetterProgressSpan(sv1DialogesLetterAllowment));
        accordionItem.show();
    } else if (currentState == 'AWAIT_AUTHORISATION') {
        container.append('<span>Das Anschreiben wartet auf freigabe.</span>');
        accordionItem.show();
    } else if (currentState == 'ALREADY_SEND') {
        container.append('<span>Sie haben bereits ein Anschreiben getätigt.</span>');
        if (sv1DialogesLetterAllowment.nextPosible) {
            container.append('<br><span>M&ouml;glich ab: ' + sv1DialogesLetterAllowment.nextPosible + ' </span>');
        }
        accordionItem.show();
    } else if (currentState == 'NOT_ALLOWED') {
        accordionItem.hide();
        container.append('<span>Das Profil darf keine Anschreiben machen.</span>');
    } else if (currentState == 'ALREADY_RUNNING') {
        accordionItem.show();
        container.append('<span>Es läuft bereits ein Anschreiben</span>');
    } else {
        accordionItem.hide();
    }
}

function addSv1DialogesLetterText(chatLoginId) {
    var sv1DialogesTextContainer = $("#sv1DialogesLetterTextContainer_" + chatLoginId);
    var availTextCnt = sv1DialogesTextContainer.find("> div").length;
    sv1DialogesTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + 1) + '</b></h6><textarea id="sv1Dialoges_text' + (availTextCnt) + '_' + chatLoginId + '" name="text[' + (availTextCnt) + ']" style="flex-grow: 1;"onKeyUp="sv1DialogesLetter_validate_' + chatLoginId + '();"></textarea></div></div>');
}

function removeSv1DialogesLetterText(chatLoginId) {
    var sv1DialogesTextContainer = $("#sv1DialogesLetterTextContainer_" + chatLoginId);
    var allowment = dialogesLetterallowments[chatLoginId];

    var availTextCnt = sv1DialogesTextContainer.find("> div").length;
    if (availTextCnt > allowment.countRequiredTexts) {
        sv1DialogesTextContainer.children().last().remove();
    }
}

var favoLetterallowments = [];

function addFavoLetterText(chatLoginId) {
    var favoTextContainer = $("#favoLetterTextContainer_" + chatLoginId);
    var availTextCnt = favoTextContainer.find("> div").length;
    favoTextContainer.append('<div class="row text-start"><div class="col-md-12" style="display: flex; flex-direction: column;"><h6><b>Text ' + (availTextCnt + 1) + '</b></h6><textarea id="favo_text' + (availTextCnt) + '_' + chatLoginId + '" name="text[' + (availTextCnt) + ']" style="flex-grow: 1;"onKeyUp="favoLetter_validate_' + chatLoginId + '();"></textarea></div></div>');
}

function removeFavoLetterText(chatLoginId) {
    var favoTextContainer = $("#favoLetterTextContainer_" + chatLoginId);
    var allowment = favoLetterallowments[chatLoginId];

    var availTextCnt = favoTextContainer.find("> div").length;
    if (availTextCnt > allowment.countRequiredTexts) {
        favoTextContainer.children().last().remove();
    }
}

function getSv1DialogesLetterButton(chatLoginId) {
    var a = '<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#sv1DialogesLetterTextModal_' + chatLoginId + '">Anschreiben starten</button>';
    return a;
}
