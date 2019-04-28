const randomURL = "https://www.random.org/";
const databaseAPI = "https://epicsevendb-apiserver.herokuapp.com/api/";
const databaseURL = "https://epicsevendb.com/";
const assetsURL = "https://assets.epicsevendb.com/";

const maxCardAmount = 47;
const limitRolls = false;

var unitsAcquired = 0;
var unitCache = {
    hero: { loaded: false },
    artifact: { loaded: false }
};
var cardList= [];

// Cahce Units
function loadUnits() {
    cahceUnits("hero");
    cahceUnits("artifact");
}
function cahceUnits(type) {
    $.get(databaseAPI + type, function(data, status) {
        if(status == "success") {
            var units = data.results;
            $.each(units, function(i) {
                unitCache[type][units[i].fileId] = units[i];
            });
            unitCache[type].loaded = true;
        } 
    });   
}
loadUnits();

// Seed RNG
var seeded = false;
var currentSeed;
function seedRNG(seedString) {
    Math.seedrandom(seedString);
    $("#seed").val(seedString);
    currentSeed = seedString;
    seeded = true;
    console.log("Seed: " + seedString);
}
function getRandomSeed(callback) {
    $(".seed").prop("disabled", true);
    $.get(randomURL + "strings/?num=1&len=19&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain&rnd=new", function(data, status) {
        if(status == "success") {
            callback(data);
            $(".seed").prop("disabled", false);
        }       
    });
}
getRandomSeed(function(data) {
    seedRNG(data);
});

// Load Checker
var loadCheck = setInterval(function() {
    if(seeded && unitCache.hero.loaded && unitCache.artifact.loaded) {
        $("#summon").text("Summon")
        .find(".summon-load-icon").addClass("load-icon-hide");
        console.log("Unit Info Cached");
        clearInterval(loadCheck);
    }
}, 100);

// Create Grid
var $summon_grid = $(".summon-grid").isotope({
    itemSelector: ".summon-card"
});

// Summon
$("#summon").click(function() {
    if(seeded && unitCache.hero.loaded && unitCache.artifact.loaded) {
        var $banner_select = $("#banner-select");
        var banner = $banner_select.attr("data-banner");
        var pool = $banner_select.attr("data-pool");

        var $new_card = $("<div class='summon-card' id='unit-" + unitsAcquired + "'></div>");
        var $card_image = $("<a class='summon-card-image shadow'></div></a>");
        var $color_divs = $("<div class='color-div unit-overlay'></div><div class='color-div unit-bg shadow'>");
        var $loading = $("<img class='load-icon'>").attr("src", "assets/loading.svg");

        $card_image.append($color_divs);
        $card_image.append($loading);
        $new_card.append($card_image);
        $new_card.attr("data-banner", banner).attr("data-pool", pool);
        $summon_grid.prepend($new_card)
        .isotope("prepended", $new_card);
        cardList[unitsAcquired] = $new_card;
        unitsAcquired++;

        Roll(banner, pool, unitsAcquired);
        filterGrid();

        if(!$(".grid-placeholder").hasClass("grid-placeholder-hide")) {
            $(".grid-placeholder").addClass("grid-placeholder-hide");
            $summon_grid.isotope("hideItemElements", $(".grid-placeholder")).isotope("layout");
        }   

        if(unitsAcquired > maxCardAmount && limitRolls) 
            $summon_grid.isotope("remove", $summon_grid.find("#unit-" + (unitsAcquired - maxCardAmount - 1))).isotope("layout");
            
    }  
});

$("#refresh").click(function() {
    $summon_grid.children(".summon-card").each(function() {
        if($(this).attr("id") != undefined)
            $summon_grid.isotope("remove", $(this)).isotope("layout");
    });
    if($(".grid-placeholder").hasClass("grid-placeholder-hide")) {
        $(".grid-placeholder").removeClass("grid-placeholder-hide");
        $summon_grid.isotope("revealItemElements", $(".grid-placeholder")).isotope("layout");
    }
    unitsAcquired = 0;
    cardList = [];
    filterGrid(); 
});

$("#open-menu").click(function() {
    $("#seed").val(currentSeed);
    updateRollStats();
});

$("#seed-copy").click(function() {
    $("#seed").select();
    document.execCommand("copy");
});

$("#seed-randomize").click(function() {
    getRandomSeed(function(data) {
        $("#seed").val(data);
    });
});

$("#seed-save").click(function() {
    seedRNG($("#seed").val());
});

$(".menu-select-item").click(function() {
    $(".menu-screen").each(function() {
        if(!$(this).hasClass("menu-hide"))
            $(this).addClass("menu-hide");
    });
    $("." + $(this).attr("data-menu")).removeClass("menu-hide");
});

$(".banner-item").click(function() {
    var $banner_select = $("#banner-select");
    var banner = $(this).attr("data-banner");
    var pool = $(this).attr("data-pool");

    $banner_select.attr("data-banner", banner);
    $banner_select.attr("data-pool", pool);

    var $item_attr = $(this).attr("class");
    var itemLastClass = $item_attr.substr($item_attr.lastIndexOf(" ") + 1);
    var bannerLastClass = $banner_select.attr("class").split(" ").pop();

    $banner_select.removeClass(bannerLastClass).addClass(itemLastClass);
    $banner_select.text($(this).text());
    filterGrid();
});

function Roll(banner, pool, id) {
    // Clone Rates object using the power of JSON
    var r = JSON.parse(JSON.stringify(Rates[banner]));
    $.each(r, function(i) {
        if(i > 0) 
            r[i][0] += r[i - 1][0];      
    });
    r.unshift([0]); // Placeholder, for determining range purposes

    // [0] = Rate, [1] = Rarity, [2] = Type
    getRandom(0, 100 * 100, function(data) {
        var result = parseInt(data) / 100;
        $.each(r, function(i) {
            if(i > 0) {
                if(result >= r[i - 1][0] && result < r[i][0]) {
                    var rarity = r[i][1];
                    var type = r[i][2];
                    // Rolled Banner Unit
                    if(rarity == "New") {
                        if(banner == "LimitedBanner") {
                            if(type == "hero")
                                summonUnit(type, Pool.LimitedUnit, id);
                            else
                                summonUnit(type, Pool.LimitedArtifact, id);
                        } else if(banner == "RateUpBanner"){
                            if(type == "hero")
                                summonUnit(type, Pool.NewHero, id);
                            else
                                summonUnit(type, Pool.NewArtifact, id);
                        } else if(banner == "DoubleBanner") {
                            getRandom(0, 1, function(data) {
                                var index = parseInt(data);
                                summonUnit(type, Pool.DoubleBanner[index], id);
                            });
                        }       
                    } else {
                        // Get random unit from pool
                        var currentPool = Pool[pool][type][rarity];
                        getRandom(1, currentPool.length, function(data) {
                            var index = parseInt(data) - 1;
                            summonUnit(type, currentPool[index], id);
                        });
                    }   
                }
            }
        });
    });
}

function getRandom(minValue, maxValue, callback) {
    /*var request = "integers/?num=1&min=" + minValue + "&max=" + maxValue + "&col=1&base=10&format=plain&rnd=new";
    $.get(randomURL + request, function(data, status) {
        if(status == "success") 
            callback(data);
    });*/ //This method takes too long to load, hence the seeded RNG
    callback(minValue + (Math.floor(Math.random() * (maxValue - minValue + 1))));
}

function summonUnit(type, fileId, id) {
    var unit = unitCache[type][fileId];
    var $card = cardList[id - 1];
    var imageUnit = assetsURL + type + "/" + fileId + "/small" + getImgExtension(type);
    var imageError = assetsURL + type + "/_placeholder/small_missing" + getImgExtension(type);
    var image = $("<img>")
    .on("error", function() {
        $(this).attr("src", imageError);
    })
    .on("load", function() {                  
        var $name_div = $("<div class='name-div'></div>");
        if((type == "artifact" && unit.rarity > 3) || (type == "hero")) {
            var classURL = assetsURL + "class/cm_icon_role_" + (type == "hero" ? unit.classType : unit.exclusive[0]) + ".png";
            var $class_img = $("<img class='class-icon' src='" + classURL +"'>");
            $name_div.append($class_img);
        }

        var $unit_name = $("<div class='unit-name text-shadow'>" + unit.name + "</div>");
        $name_div.append($unit_name);
        $card.append($name_div);

        var $atrribute_div = $("<div class='attribute-div'></div>");
        if(type == "hero") {
            var elementURL = assetsURL + "attribute/cm_icon_pro" + ((unit.element == "dark" || unit.element == "light") ? "m" : "") + unit.element + ".png";
            var $element_img = $("<img class='element-icon' src='" + elementURL +"'>");
            $atrribute_div.append($element_img);
        }

        var $star = $("<div class='star-" + unit.rarity + "'></div>");
        $atrribute_div.append($star);
        $card.append($atrribute_div);
        
        $card.find(".summon-card-image").attr("href", databaseURL + type + "/" + fileId).attr("target", "_blank"); console.log(unit.name);
        $card.find(".unit-overlay").addClass("unit-loaded");
        $card.find(".load-icon").addClass("load-icon-hide");
    })
    .attr("src", imageUnit)
    .addClass("unit-img");
    $card.find(".summon-card-image").addClass("rarity-" + unit.rarity)
    .append(image).attr("data-type", type).attr("data-unit", fileId);
}

/* Deprecated, better caching system implemented
function getUnitInfo(type, fileId, callback) {
    if(unitCache[fileId] != undefined) {
        setTimeout(callback(unitCache[fileId]), 100);
    }
    else {
        var request = type + "/" + fileId;
        $.get(databaseAPI + request, function(data, status) {
            if(status == "success") {
                var unit = data.results[0];
                //unitCache[fileId] = unit;
                callback(unit);
            } 
        });
    } 
}
*/

function getImgExtension(type) {
    if(type == "hero")
        return ".png";
    return ".jpg";
}

function filterGrid() {
    var $banner_select = $("#banner-select");
    //$summon_grid.isotope({ filter: "[data-banner='" + $banner_select.attr("data-banner") + "'][data-pool='" + $banner_select.attr("data-pool") + "'],.grid-placeholder" });
    $summon_grid.isotope({ 
        filter: function() {
            if($(this).hasClass("grid-placeholder")) 
                return (!$(this).hasClass("grid-placeholder-hide"));  
            return ($(this).attr("data-banner") == $banner_select.attr("data-banner") && $(this).attr("data-pool") == $banner_select.attr("data-pool"));
        }
    });
}

function updateRollStats() {
    $(".stats").each(function() {
        var amount = $summon_grid.find("[data-banner='" + $(this).attr("data-banner") + "'][data-pool='" + $(this).attr("data-pool") + "']").length;
        $(this).text(amount);
    });
    $("#rolls-total").text(unitsAcquired);
}