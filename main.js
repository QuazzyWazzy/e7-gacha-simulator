const randomURL = "https://www.random.org/";
const databaseAPI = "https://epicsevendb-apiserver.herokuapp.com/api/";
const databaseURL = "https://epicsevendb.com/";
const assetsURL = "https://assets.epicsevendb.com/";

const maxCardAmount = 47;
var unitsAcquired = 0;
var unitCache = {};

// Seed RNG
var seeded = false;
$.get(randomURL + "strings/?num=1&len=19&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain&rnd=new", function(data, status) {
    if(status == "success") {
        Math.seedrandom(data);
        seeded = true;
    }
});

// Create Grid
var $summon_grid = $(".summon-grid").isotope({
    itemSelector: ".summon-card"
});

// Summon
$("#summon").click(function() {
    if(seeded) {
        var $banner_select = $("#banner-select");
        Roll($banner_select.attr("data-banner"), $banner_select.attr("data-summon"), unitsAcquired);

        var $new_card = $("<div class='summon-card' id='unit" + unitsAcquired + "'></div>");
        var $card_image = $("<a class='summon-card-image shadow'></div></a>");
        var $color_divs = $("<div class='color-div unit-overlay'></div><div class='color-div unit-bg shadow'>");
        var $loading = $("<img class='load-icon'>").attr("src", "assets/loading.svg");

        $card_image.append($color_divs);
        $card_image.append($loading);
        $new_card.append($card_image);

        $summon_grid.prepend($new_card)
        .isotope("prepended", $new_card);
        unitsAcquired++;

        if(!$(".grid-placeholder").hasClass("hide"))
            $(".grid-placeholder").addClass("grid-placeholder-hide");

        if(unitsAcquired > maxCardAmount) 
            $summon_grid.isotope("remove", $summon_grid.find("#unit" + (unitsAcquired - maxCardAmount - 1)).isotope("layout"));    
    }  
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
                if(result >= r[i - 1][0] && result < r[i][0])
                {
                    var rarity = r[i][1];
                    var type = r[i][2];

                    if(rarity == "New") {
                        if(banner == "LimitedBanner")
                            summonUnit(type, Pool.LimitedUnit, id);
                        else {
                            if(type == "hero")
                                summonUnit(type, Pool.NewHero, id);
                            else
                                summonUnit(type, Pool.NewArtifact, id);
                        }         
                    } else {
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
    });*/
    callback(minValue + (Math.floor(Math.random() * (maxValue - minValue + 1))));
}

function summonUnit(type, fileId, id) {
    getUnitInfo(type, fileId, function(unit) {   
        var $card = $("#unit" + id);
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
            
            $card.find(".unit-overlay").addClass("unit-loaded");
            $card.find(".load-icon").addClass("hide"); 
            $card.find(".summon-card-image").attr("href", databaseURL + type + "/" + fileId).attr("target", "_blank"); console.log(unit.name); 
        })
        .attr("src", imageUnit)
        .addClass("unit-img");
        $card.find(".summon-card-image").append(image).attr("data-type", type).attr("data-unit", fileId);  
    });
}

function getUnitInfo(type, fileId, callback) {
    /*if(unitCache[fileId] != undefined)
        callback(unitCache[fileId]);
    else {*/
        var request = type + "/" + fileId;
        $.get(databaseAPI + request, function(data, status) {
            if(status == "success") {
                var unit = data.results[0];
                unitCache[fileId] = unit;
                callback(unit);
            } 
        });
    //} 
}

function getImgExtension(type) {
    if(type == "hero")
        return ".png";
    return ".jpg";
}

$(".banner-item").on("click", function() {
    var $banner_select = $("#banner-select");
    $banner_select.attr("data-banner", $(this).attr("data-banner"));
    $banner_select.attr("data-summon", $(this).attr("data-summon"));
    var $item_attr = $(this).attr("class");
    var itemLastClass = $item_attr.substr($item_attr.lastIndexOf(" ") + 1);
    var bannerLastClass = $banner_select.attr("class").split(" ").pop();
    $banner_select.removeClass(bannerLastClass).addClass(itemLastClass);
    $banner_select.html($(this).html());
});