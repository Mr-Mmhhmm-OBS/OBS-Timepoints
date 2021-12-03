Number.prototype.padStart = function (size) {
    var s = String(this);
    while (s.length < size) { s = "0" + s; }
    return s;
}

Number.prototype.formatDuration = function () {
    return (Math.floor(this / 60 / 60) % 60).padStart(2) + ":" + (Math.floor(this / 60) % 60).padStart(2) + ":" + (this % 60).padStart(2);
}

String.prototype.toSeconds = function () {
    if (!this) return null; var hms = this.split(':');
    return (+hms[0]) * 60 * 60 + (+hms[1]) * 60 + (+hms[2] || 0);
}

function IndexOfElement(element) {
    return Array.from(element.parentElement.children).indexOf(element)
}

var start_time = Math.trunc(new Date().getTime() / 1000);
var order_of_service = [];
var key_moments = [];
var auto_scenes = {};
var scene_names = [];

const obs = new OBSWebSocket();
obs.connect().then(() => {
    EnableAddKeyMoment();
    EnableResetKeyMoments();

    obs.on('StreamStarted', data => {
        if (key_moments.length === 0) {
            start_time = Math.trunc(new Date().getTime() / 1000);
            AddKeyMoment(0);
            window.localStorage.setItem("start-time", start_time);
        } else {
            EnableAddKeyMoment();
            EnableResetKeyMoments();
        }

    });
    obs.on('StreamStopped', data => {
        EnableAddKeyMoment();
        EnableResetKeyMoments();
    });
    obs.on('RecordingStarted', data => {
        if (key_moments.length === 0) {
            start_time = Math.trunc(new Date().getTime() / 1000);
            AddKeyMoment(0);
            window.localStorage.setItem("start-time", start_time);
        } else {
            EnableAddKeyMoment();
            EnableResetKeyMoments();
        }
    });
    obs.on('RecordingStopped', data => {
        EnableAddKeyMoment();
        EnableResetKeyMoments();
    });
});

window.onload = function () {
    $("#order-of-service").on("click", "li[selected] button.additem", function (e) {
        var index = IndexOfElement(e.currentTarget.parentElement);
        order_of_service.splice(index + 1, 0, "");
        var $el = CreateServiceItem("", index);
        $(e.currentTarget.parentElement).after($el);
        $el.find(".service-item").focus();
    }).on('keydown', ".service-item", (e) => {
        switch (e.key) {
            case 'Enter':
                if (e.currentTarget.innerText.length > 0) {
                    var index = IndexOfElement(e.currentTarget.parentElement);
                    if (e.currentTarget.innerText.length > 1 && document.getSelection().getRangeAt(0).endOffset > 1) {
                        order_of_service.splice(index + 1, 0, "");
                        var $el = CreateServiceItem("", index + 1);
                        $(e.currentTarget.parentElement).after($el);
                        $el.find(".service-item").focus();
                    } else {
                        order_of_service.splice(index, 0, "");
                        var $el = CreateServiceItem("", index);
                        $(e.currentTarget.parentElement).before($el);
                        $el.find(".service-item").focus();
                    }
                } else {
                    e.currentTarget.blur();
                }
                break;
            case 'Backspace':
                if (e.currentTarget.innerText.length === 0) {
                    e.preventDefault();
                    var $el = $(e.currentTarget.parentElement.previousSibling).find(".service-item");
                    $el.focus();

                    // Set carot to end of text
                    var range = document.createRange();
                    range.setStart($el[0].childNodes[0], $el.text().length);
                    range.collapse(true);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                break;
            default:
        }
    }).on("focus", ".service-item", function (e) {
        e.currentTarget.removeAttribute("auto-scene");
    }).on("blur", ".service-item", function (e) {
        var index = IndexOfElement(e.currentTarget.parentElement);
        var value = e.currentTarget.innerText;
        order_of_service[index] = value;
        window.localStorage.setItem("order-of-service", JSON.stringify(order_of_service.filter(e => e)));
        if (value.length === 0 && order_of_service.length > 1) {
            // Remove empty service item
            e.currentTarget.parentElement.remove();
            order_of_service.splice(index, 1);
        } else {
            e.currentTarget.setAttribute("auto-scene", value.length > 0 && typeof auto_scenes[value] === 'string' ? auto_scenes[value] : "");
        }
        EnableAddKeyMoment();
    });

    var value = window.localStorage.getItem("auto-scenes");
    if (typeof value === 'string' && value.length > 0) {
        auto_scenes = JSON.parse(value);
        for (var service_item in auto_scenes) {
            AddAutoScene(service_item);
        }
    }

    var value = window.localStorage.getItem("key-moments");
    if (typeof value === 'string' && value.length > 0) {
        key_moments = JSON.parse(value);
        var el = document.getElementById("key-moments");
        for (var i = 0; i < key_moments.length; i++) {
            el.value += (i > 0 ? "\n" : "") + key_moments[i].timecode.formatDuration() + " " + key_moments[i].name;
        }
    }

    var value = window.localStorage.getItem("order-of-service");
    if (typeof value === 'string' && value.length > 0) {
        order_of_service = JSON.parse(value);
        if (order_of_service.length > 0) {
            for (var index = 0; index < order_of_service.length; index++) {
                $("#order-of-service").append(CreateServiceItem(order_of_service[index], index));
            }
        } else {
            $("#order-of-service").append(CreateServiceItem());
        }
    } else {
        $("#order-of-service").append(CreateServiceItem());
    }

    var value = window.localStorage.getItem("start-time");
    if (typeof value === 'string' && value.length > 0) {
        start_time = parseInt(value);
    }

    if (key_moments.length > 0) {
        document.getElementById("order-of-service").children[key_moments.length - 1].setAttribute("selected", "selected");
    }

    //document.getElementById("text").innerHTML = window.obsstudio.pluginVersion;

    function CreateServiceItem(item, index) {
        var hasItem = typeof item === 'string' && item.length > 0;
        $el = $("<li/>").append(
            $("<span/>", {
                class: "service-item",
                spellcheck: true,
                contentEditable: !hasItem || (typeof index === 'number' && key_moments.length <= index),
                "auto-scene": auto_scenes[item],
                text: item
            }),
            $("<button/>", { class: "additem", tabindex:-1 }).html("+")
        );
        autocomplete($el.find(".service-item"));
        return $el;
    }
}

function EditAutoScenes(enable) {
    document.getElementById("auto-scenes-editor").style.display = (enable ? "" : "none");
    if (enable) {
        var auto_scenes_el = document.getElementById("auto-scenes");
        for (var tr of auto_scenes_el.children) {
            var options_el = tr.children[2];
            while (options_el.firstChild) {
                options_el.firstChild.remove();
            }
        }
        obs.send('GetSceneList').then((data) => {
            while (scene_names.length) {
                scene_names.pop();
            }
            for (var scene of data.scenes) {
                scene_names.push(scene.name);
            }
            var rows = document.getElementById("auto-scenes").children;
            for (var tr_idx = 0; tr_idx < rows.length; tr_idx++) {
                var select = rows[tr_idx].children[2];
                PopulateOptions(select, scene_names);

                var service_item = rows[tr_idx].children[1].value;
                if (service_item.length > 0 && typeof auto_scenes[service_item] === 'string') {
                    SelectOption(select, auto_scenes[service_item]);
                }
            }
        });
    } else {
        auto_scenes = {};
        for (var item of document.getElementById("auto-scenes").children) {
            var service_item = item.children[1].value;
            if (service_item.length > 0) {
                auto_scenes[service_item] = item.children[2].value;
            }
        }
        window.localStorage.setItem("auto-scenes", JSON.stringify(auto_scenes));
        for (var el of $("#order-of-service .service-item")) {
            var value = el.innerText;
            el.setAttribute("auto-scene", value.length > 0 && typeof auto_scenes[value] === 'string' ? auto_scenes[value] : "");
        }
    }
}

function AddAutoScene(service_item) {
    var $auto_scene = $("<div/>", { class: "auto-scene" }).append(
        $("<button/>", {
            class: "remove"
        }).on('click', () => {
            event.currentTarget.parentElement.remove();
        }),
        $("<input/>", {
            type: "text", spellcheck: true,
            placeholder: "Service Item"
        }).val(service_item),
        $("<select/>")
    );
    $("#auto-scenes").append(
        $auto_scene
    );

    PopulateOptions($auto_scene.find("select")[0], scene_names);
}

function PopulateOptions(select, options, canDisable) {
    if (canDisable !== false) {
        var el = document.createElement("option");
        el.value = "";
        el.innerText = "--Disabled--";
        select.appendChild(el);
    }
    for (var option of options) {
        var el = document.createElement("option");
        el.value = option;
        el.innerText = option;
        select.appendChild(el);
    }
}

function SelectOption(selectElement, optionValToSelect) {
    for (var opt, j = 0; opt = selectElement.children[j]; j++) {
        //If the option of value is equal to the option we want to select.
        if (opt.value == optionValToSelect) {
            //Select the option and break out of the for loop.
            selectElement.selectedIndex = j;
            break;
        }
    }
}

var countdown_timeout = null;
function EnableAddKeyMoment(countdown) {
    if (key_moments.length < order_of_service.length) {
        if (typeof countdown === 'number' && countdown > 0) {
            $("#add_key_moment").attr("count-down", countdown);
            if (countdown_timeout != null) {
                clearTimeout(countdown_timeout);
            }
            countdown_timeout = setTimeout(function () {
                countdown--;
                EnableAddKeyMoment(countdown);
            }, (1000));
        }
        else {
            if (countdown_timeout != null) {
                clearTimeout(countdown_timeout);
            }
            countdown_timeout = null;
            $("#add_key_moment").removeAttr('count-down');
            obs.send("GetStreamingStatus").then((data) => {
                var el = document.getElementById("add_key_moment");
                var disabled = (data.recording === false && data.streaming === false);
                el.disabled = disabled;
                if (!disabled && key_moments.length > 0) {
                    var key_moment_duration = Math.trunc((start_time + key_moments[key_moments.length - 1].timecode + 10) - (new Date().getTime() / 1000));
                    if (key_moment_duration > 0 && key_moment_duration <= 10) {
                        el.disabled = true;
                        EnableAddKeyMoment(Math.trunc((start_time + key_moments[key_moments.length - 1].timecode + 10) - (new Date().getTime() / 1000)));
                    }
                }
            });
        }
    } else {
        $("#add_key_moment").attr("disabled", true);
        $("#add_key_moment").removeAttr('count-down');
    }
}

function EnableResetKeyMoments() {
    obs.send("GetStreamingStatus").then((data) => {
        var disabled = key_moments.length === 0 || data.recording === true || data.streaming === true;

        var el = document.getElementById("reset-key-moments");
        if (!disabled && key_moments.length >= order_of_service.length) {
            document.getElementById("key-moments").setAttribute("highlight", "highlight");
            el.setAttribute("highlight", "highlight");
        } else {
            document.getElementById("key-moments").removeAttribute("highlight");
            el.removeAttribute("highlight");
        }
        el.disabled = disabled;
    });
}

function AddKeyMoment(timecode) {
    if (key_moments.length < order_of_service.length && order_of_service[key_moments.length].length > 0) {
        if (key_moments.length > 0) {
            $("#order-of-service li:nth-child(" + key_moments.length + ")").removeAttr("selected");
        }
        $("#order-of-service li:nth-child(" + (key_moments.length + 1) + ")").attr("selected", "selected");
        $("#order-of-service li:nth-child(" + (key_moments.length + 1) + ") .service-item").attr("contentEditable", false);

        var el = document.getElementById("key-moments");
        if (typeof timecode !== 'number') {
            var timecode = Math.trunc(new Date().getTime() / 1000) - start_time;
        }
        var service_item = order_of_service[key_moments.length];
        el.value += (key_moments.length > 0 ? "\n" : "") + timecode.formatDuration() + " " + service_item;
        el.scrollTop = el.scrollHeight
        if (typeof auto_scenes[service_item] === 'string' && auto_scenes[service_item].length > 0) {
            obs.send('SetCurrentScene', { 'scene-name': auto_scenes[service_item] });
        }
        key_moments.push({ name: service_item, timecode: timecode });
        window.localStorage.setItem("key-moments", JSON.stringify(key_moments));
        EnableResetKeyMoments();

        document.getElementById("add_key_moment").disabled = true;
        EnableAddKeyMoment(10);
    }
}

function Reset() {
    if (key_moments.length > 0) {
        document.getElementById("order-of-service").children[key_moments.length - 1].removeAttribute("selected");
    }
    $("#order-of-service .service-item").attr("contentEditable", true);
    window.localStorage.removeItem("key-moments");
    document.getElementById("key-moments").value = "";

    while (key_moments.length) {
        key_moments.pop();
    }
    EnableAddKeyMoment();
    EnableResetKeyMoments();
}