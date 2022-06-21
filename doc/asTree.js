// Convert ShEx to FHIR Logical Tables

// Global configuration and control variables.
var TOGGLE_TIME = 50 // time in μsec to toggle collapsed lists.
var RENDER_DELAY = 50 // time to pause for display (horrible heuristics). Could try: .css('opacity', .99)
var BUILD_PRODUCTS = true // can disable if OWL and ShEx construction crashes.
var SUPPRESS_DUPLICATE_CLASSES = true // Don't list subclasses in parent's package.
var UPPER_UNLIMITED = '*'

var Getables = [
];

function prepareControls () {
  $("#menu-button").on("click", toggleControls);
  // $("#interface").on("change", setInterface);
  // $("#regexpEngine").on("change", toggleControls);
  // $("#validate").on("click", disableResultsAndValidate);
  // $("#clear").on("click", clearAll);
  // $("#download-results-button").on("click", downloadResults);

  $("#loadForm").dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      "GET": function (evt, ui) {
        results.clear();
        var target = Getables.find(g => g.queryStringParm === $("#loadForm span").text());
        var url = $("#loadInput").val();
        var tips = $(".validateTips");
        function updateTips (t) {
          tips
            .text( t )
            .addClass( "ui-state-highlight" );
          setTimeout(function() {
            tips.removeClass( "ui-state-highlight", 1500 );
          }, 500 );
        }
        if (url.length < 5) {
          $("#loadInput").addClass("ui-state-error");
          updateTips("URL \"" + url + "\" is way too short.");
          return;
        }
        tips.removeClass("ui-state-highlight").text();
        target.cache.asyncGet(url).catch(function (e) {
          updateTips(e.message);
        });
      },
      Cancel: function() {
        $("#loadInput").removeClass("ui-state-error");
        $("#loadForm").dialog("close");
        toggleControls();
      }
    },
    close: function() {
      $("#loadInput").removeClass("ui-state-error");
      $("#loadForm").dialog("close");
      toggleControls();
    }
  });
  Getables.forEach(target => {
    var type = target.queryStringParm
    $("#load-"+type+"-button").click(evt => {
      var prefillURL = target.url ? target.url :
          target.cache.meta.base && target.cache.meta.base !== DefaultBase ? target.cache.meta.base :
          "";
      $("#loadInput").val(prefillURL);
      $("#loadForm").attr("class", type).find("span").text(type);
      $("#loadForm").dialog("open");
    });
  });

  $("#about").dialog({
    autoOpen: false,
    modal: true,
    width: "50%",
    buttons: {
      "Dismiss": dismissModal
    },
    close: dismissModal
  });

  $("#about-button").click(evt => {
    $("#about").dialog("open");
  });

  function dismissModal (evt) {
    // $.unblockUI();
    $("#about").dialog("close");
    toggleControls();
    return true;
  }

  // Prepare file uploads
  $("input.inputfile").each((idx, elt) => {
    $(elt).on("change", function (evt) {
      var reader = new FileReader();

      reader.onload = function(evt) {
        if(evt.target.readyState != 2) return;
        if(evt.target.error) {
          alert("Error while reading file");
          return;
        }
        $($(elt).attr("data-target")).val(evt.target.result);
      };

      reader.readAsText(evt.target.files[0]);
    });
  });
}

function toggleControls (evt) {
  var revealing = evt && $("#controls").css("display") !== "flex";
  $("#controls").css("display", revealing ? "flex" : "none");
  toggleControlsArrow(revealing ? "up" : "down");
  if (revealing) {
    var target = evt.target;
    while (target.tagName !== "BUTTON")
      target = target.parentElement;
    if ($("#menuForm").css("position") === "absolute") {
      $("#controls").
        css("top", 0).
        css("left", $("#menu-button").css("margin-left"));
    } else {
      var bottonBBox = target.getBoundingClientRect();
      var controlsBBox = $("#menuForm").get(0).getBoundingClientRect();
      var left = bottonBBox.right - bottonBBox.width; // - controlsBBox.width;
      $("#controls").css("top", bottonBBox.bottom).css("left", left);
    }
    $("#permalink a").attr("href", getPermalink());
  }
  return false;
}

function toggleControlsArrow (which) {
  // jQuery can't find() a prefixed attribute (xlink:href); fall back to DOM:
  if (document.getElementById("menu-button") === null)
    return;
  var down = $(document.getElementById("menu-button").
               querySelectorAll('use[*|href="#down-arrow"]'));
  var up = $(document.getElementById("menu-button").
             querySelectorAll('use[*|href="#up-arrow"]'));

  switch (which) {
  case "down":
    down.show();
    up.hide();
    break;
  case "up":
    down.hide();
    up.show();
    break;
  default:
    throw Error("toggleControlsArrow expected [up|down], got \"" + which + "\"");
  }
}

function main () {
  let $ = window.jQuery

  $('#load-file').on('change', function (evt) {
    if (!window.FileReader) {
      return // not supported
    }
    for (let i = 0; i < evt.target.files.length; ++i) {
      (function (file) {
        // Give user some interface feedback before reading.
        let div = $('<div/>', {'id': file.name}).appendTo('#loaded')
        $('<li/>').append($('<a/>', {href: '#' + file.name}).text(file.name)).appendTo('#toc')
        let status = $('<span/>').addClass('status').text('loading...')
        $('<h2/>').append(file.name, ' ', status).appendTo(div)
        window.setTimeout(() => {
          let loader = new window.FileReader()
          loader.onload = function (loadEvent) {
            if (loadEvent.target.readyState !== 2) {
              return
            }
            if (loadEvent.target.error) {
              window.alert('Error while reading file ' + file.name + ': ' + loadEvent.target.error)
              return
            }
            // This may take a long time to render.
            $('<textarea/>', {cols: 60, rows: 10}).val(loadEvent.target.result).appendTo(div)
            let doIt = evt => parseAndRender(loadEvent.target.result, 'uploaded ' + file.name, status)
            div.append($('<button/>').text('reparse').on('click', doIt))
            doIt(null)
          }
          loader.readAsText(file)
        }, RENDER_DELAY)
      })(evt.target.files[i])
    }
  })

  const cgiParms = location.search.substr(1).split(/[,&]/).map(
    pair => pair.split("=").map(decodeURIComponent)
  )
  cgiParms.forEach(pair => {
    const [name, value] = pair
    switch (name) {
    case 'NS':
      $('#namespace').val(value)
      break
    case 'URL':
      load(value)
      break
    }
  })

  $('#load-url').on('change', function (evt) { load($(this).val()); })

  function load (source) {
    // Give user some interface feedback before reading.
    let div = $('<div/>', {'id': source}).appendTo('#loaded')
    $('<li/>').append($('<a/>', {href: '#' + source}).text(source)).appendTo('#toc')
    let status = $('<span/>').addClass('status').text('fetching...')
    $('<h2/>').append(source, ' ', status).appendTo(div)
    window.fetch(source).then(function (response) {
      if (!response.ok) {
        throw Error('got ' + response.status + ' ' + response.statusText)
      }
      return response.text()
    }).then(function (text) {
      window.setTimeout(() => {
        $('<textarea/>', {cols: 60, rows: 10}).val(text).appendTo(div)
        let doIt = evt => parseAndRender(text, 'fetched ' + source, status)
        div.append($('<button/>').text('reparse').on('click', doIt))
        doIt(null)
      }, RENDER_DELAY)
    }).catch(function (error) {
      div.append($('<pre/>').text(error)).addClass('error')
    })
    return true
  }
  prepareControls()

  function parseAndRender (text, title, status) {
    let shexParser = ShExWebApp.Parser.construct($('#namespace').val())
    let schema = shexParser.parse(text)
    $('.render').append(
      ShExHTML($, marked).asTree(schema, $('#namespace').val())
    )
  }

}

window.onload = main
