let googleMapStyles = [],
    dataProviders = [],
    map = '',
    arrayOfMarkers = [],
    autocomplete = null,
    userMarker = null,
    displayPoints = [];

const EVENTS = {
    BACK: "back",
    SEARCH: "search_position",
    POSITION: 'point_position',
    PHONE: 'click_phone',
}

document.querySelector(".back").addEventListener("click", () => {
    togglePages();
    logCustomEvent(EVENTS.BACK, {'step': EVENTS.BACK,})
}, false);

document.querySelector('form').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});

function togglePages() {
    document.querySelector(".animation-page.home-page").classList.toggle("visible");
    document.querySelector(".animation-page.second-page").classList.toggle("visible");
}

function validate() {
    let input = document.getElementById('street'),
        submitButton = document.getElementById('submitButton');
    submitButton.disabled = !input.value.length;
}

function logCustomEvent(eventName, inputSettings) {
    const extraClassPage1 = document.getElementsByClassName("header-page1-wrapper");
    const extraClassPage2 = document.getElementsByClassName("header-page2-wrapper");
    const pageLoger = extraClassPage1.length > extraClassPage2.length ? "first_version" : "second_version";
    gtag('event', eventName, {
        "used_version": pageLoger,
        "user_browser": navigator.userAgent,
        ...inputSettings
    });
}

function updateMap() {
    if (userMarker) {
        userMarker.setVisible(false);
    }
    const svgMarker = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#F00",
        fillOpacity: 1,
        strokeWeight: 0
    };
    const marker = new google.maps.Marker({
        map,
        icon: svgMarker,
        anchorPoint: new google.maps.Point(0, -29),
    });
    userMarker = marker;
    marker.setVisible(false);

    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
    }

    // If the place has a geometry, then present it on a map.
    map.setZoom(window.innerWidth < 800 ? 30 : 10);
    if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
    } else {
        map.setCenter(place.geometry.location);
    }
    // map.setZoom(window.innerWidth < 800 ? 18 : 16);

    marker.setPosition(place.geometry.location);
    marker.setVisible(true);

    let postalCode, newArray, displayNearPoints;

    try {
        // Calculate and display the distance between markers
        displayNearPoints = arrayOfMarkers.map(item => ({
            ...item,
            distance: (haversine_distance(marker, item.marker) * 1.60934).toFixed(1)
        }))
        displayNearPoints = displayNearPoints.sort((a, b) => (a.distance - b.distance));

        postalCode = place.address_components.filter(item => item.types.includes("postal_code"))[0].long_name;
        newArray = arrayOfMarkers.filter(item => {
            const visible = item.ContactDetails.CompanyAddress.ZipCode === postalCode;
            // if (visible) {
            //     item.infoWindow.open({anchor: item.marker, map: map});
            //     item.marker.setVisible(true);
            // } else {
            //     item.infoWindow.close({anchor: item.marker, map: map});
            //     item.marker.setVisible(false);
            // }
            return visible;
        });
        if (newArray.length) displayNearPoints = displayNearPoints.slice(0,3);
        const idsArray = displayNearPoints.map(item => item.Id);
        arrayOfMarkers.forEach((item) => {
            if (idsArray.includes(item.Id)) {
                item.infoWindow.open({anchor: item.marker, map: map});
                item.marker.setVisible(true);
            } else {
                item.infoWindow.close({anchor: item.marker, map: map});
                item.marker.setVisible(false);
            }
        })
    } catch (error) {
        console.log(`Postal code wasn't found due to: ${error}`);
        postalCode = "";
        newArray = arrayOfMarkers;
        if (!displayNearPoints) displayNearPoints = arrayOfMarkers;
        newArray.forEach(item => {
            item.infoWindow.open({anchor: item.marker, map: map});
            item.marker.setVisible(true);
        })
    }

    displayPoints = displayNearPoints;
    displayProviders(displayNearPoints);
}

function applyForm(event) {
    event.preventDefault();
    togglePages();
    logCustomEvent(EVENTS.SEARCH, {
        'address': event.target.street.value,
    })
    updateMap();
}

function haversine_distance(mk1, mk2) {
    var R = 3958.8; // Radius of the Earth in miles
    var rlat1 = mk1.position.lat() * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = mk2.position.lat() * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (mk2.position.lng() - mk1.position.lng()) * (Math.PI / 180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
    return d;
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: window.innerWidth < 800 ? 30 : 10,
        center: {lat: 47.37882, lng: 8.54463}
    });
    map.setOptions({styles: googleMapStyles});

    const input = document.getElementById("street");
    const center = {lat: 50.064192, lng: -130.605469};
// Create a bounding box with sides ~10km away from the center point
    const defaultBounds = {
        north: center.lat + 0.1,
        south: center.lat - 0.1,
        east: center.lng + 0.1,
        west: center.lng - 0.1,
    };
    const options = {
        bounds: defaultBounds,
        componentRestrictions: {country: ["ch"]},
        fields: ["address_components", "geometry", "icon", "name"],
        strictBounds: false,
    };
    autocomplete = new google.maps.places.Autocomplete(input, options);
    autocomplete.setFields(["address"]);
    arrayOfMarkers = pinsInit();
}

function pinsInit() {
    let iconPin = './assets/map_pin.svg';

    return dataProviders.map(function (element) {
        let marker = new google.maps.Marker({
            position: new google.maps.LatLng(element.ContactDetails.CompanyAddress.GeolocationX, element.ContactDetails.CompanyAddress.GeolocationY),
            map: map,
            icon: iconPin
        });
        // onclick="clickButtonSetCenterMap(${element.ContactDetails.CompanyAddress.GeolocationX}, ${element.ContactDetails.CompanyAddress.GeolocationY}, ${element.ContactDetails.name}, ${element.Id})}"
        let contentString =
            `<div id="content" class="${element.Id}" onclick="clickButtonSetCenterMap(${element.ContactDetails.CompanyAddress.GeolocationX}, ${element.ContactDetails.CompanyAddress.GeolocationY}, ${element.ContactDetails.name}, '${element.Id}')">` +
            '<div id="siteNotice">' +
            '</div>' +
            '<div id="bodyContent">' +
            '<p><b>' +
            element.Name +
            '</b></p>' +
            '</div>' +
            '</div>';
        let infoWindow = new google.maps.InfoWindow({
            content: contentString
        });
        marker.setVisible(false);

        google.maps.event.addListener(marker, 'click', function() {
            triggerClick(element.Id);
        });

        google.maps.event.addListener(marker, 'mouseover', function() {
            redrawHover(element, marker, ' highlighted', true);
        });

        marker.addListener('mouseout', function() {
            redrawHover(element, marker, ' highlighted', false);
        });


        return {...element, marker, infoWindow};
    });
}

function redrawHover(element, marker, style, active) {
    let iconPin = './assets/map_pin.svg';
    let iconPinActive = './assets/map_pin_highlighted.svg';
    const className = element.Id;
    try {
        const container = document.getElementsByClassName(className)[0];
        const parent = container.parentElement.parentElement.parentElement;
        const hoveStyle = style;
        if (!parent.className.includes(' active') || style === ' active') {
            if (parent.className.includes(hoveStyle) || !active) {
                parent.className = parent.className.replace(hoveStyle, '');
                marker.setIcon(iconPin);
            } else {
                parent.className = `${parent.className}${hoveStyle}`;
                marker.setIcon(iconPinActive);
            }
        }
    } catch (error) {
        console.log('error', error);
    }
  //map.getBounds();
}

function triggerClick(Id) {
  const marker = displayPoints.find(item => item.Id === Id);
  displayPoints.forEach(item => {
      if (item && item.marker){
          redrawHover(item, item.marker, ' active', false)
      }
  });
  if (marker && marker.marker) {
      redrawHover(marker, marker.marker, ' active', true)
  }

  const newArray = displayPoints.filter(item => item.Id !== Id);
  displayProviders([marker, ...newArray]);
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0;

  //map.getBounds();
}

function displayProviders(data) {
    let content = '';
    data.forEach((el) => {
        let companyLink = el.ContactDetails.CompanyWebsite;
        let address = el.ContactDetails.CompanyAddress.Street ? el.ContactDetails.CompanyAddress.Street + ' ' + el.ContactDetails.CompanyAddress.HouseNumber + ', ' : '';
        let municipality = el.ContactDetails.CompanyAddress.Municipality ? el.ContactDetails.CompanyAddress.Municipality + ' ' + el.ContactDetails.CompanyAddress.ZipCode : '';
        content +=
            '<div class="provider-item">' +
            '<div class="content-wrapper">' +
            '<div class="column-wrapper">' +
            '<div class="rating-wrapper">' +
            '<p class="text name">5.0</p>' +
            '<div class="grade lit"></div>' +
            '<div class="grade lit"></div>' +
            '<div class="grade lit"></div>' +
            '<div class="grade lit"></div>' +
            '<div class="grade lit"></div>' +
            '</div>' +
            '<div>' +
            '<a onclick="clickButtonCallAction(event)" href="tel:' + el.ContactDetails.TelephoneNumber + '" class="text address button-phone">Anrufen</a>' +
            '</div>' +
            '</div>' +
            '<div>' +
            (companyLink ? '<a target="_blank" href="' + companyLink + '">' : '') +
            '<p class="text name">' + el.Name + '</p>' +
            '<p class="text address">' + address + municipality + '</p>' +
            (companyLink ? '</a>' : '') +
            '</div>' +
            '<div class="column-wrapper">' +
            '<div class="rating-wrapper ">' +
            '<div class="grade near-me-icon"></div>' +
            '<p class="text name">' + (el.distance || '> 10') + 'km</p>' +
            '</div>' +
            '<div>' +
            '<div class="text name standort-button" data-lat="' + el.ContactDetails.CompanyAddress.GeolocationX + '" data-lng="' + el.ContactDetails.CompanyAddress.GeolocationY + '" onclick="clickButtonSetCenterMap(' + el.ContactDetails.CompanyAddress.GeolocationX + ', ' + el.ContactDetails.CompanyAddress.GeolocationY + ', \'' + el.ContactDetails.name + '\', \'' + el.Id + '\')">Standort</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    });
    if (content) {
        document.querySelector(".text-providers").classList.remove('hidden');
        document.querySelector(".providers-wrapper").innerHTML = content;
    }
}
function clickButtonSetCenterMap(lat, lng, name, Id) {
    console.log('---rerererere');
    logCustomEvent(EVENTS.POSITION, {'name': name,})
    map.setCenter(new google.maps.LatLng(lat, lng));
    triggerClick(Id);
}

function clickButtonCallAction(event) {
    const phone = event.target.getAttribute('href').split('tel:')[1];
    logCustomEvent(EVENTS.PHONE, {'phone': phone,})
    if (window.innerWidth > 700) {
        event.preventDefault();
        document.querySelector(".phone-popup-number").innerHTML = phone;
        document.querySelector(".phone-popup").classList.remove('hidden');
        // alert(phone);
        // let text;
        // if (confirm(phone) === true) {
        //     // window.open(phone, '_self')
        // }
    }
}

(function closePopup() {
    document.querySelector(".phone-popup-button").addEventListener('click', () => {
        document.querySelector(".phone-popup").classList.add('hidden');
    });
})();

dataProviders = [{
    "Id": "17f878fe-ecf4-4558-b7d3-19db30e10cfa",
    "Name": "Craftsman",
    "Surname": "Support",
    "ContactDetails": {
        "TelephoneNumber": "+41 76 111 11 11",
        "CompanyAddress": {
            "Street": "Albisrieder - Platz",
            "HouseNumber": "",
            "Municipality": "Zürich",
            "Canton": "ZH",
            "AdministrativeAreaLevel2": "Zürich",
            "Country": "CH",
            "ZipCode": "8004",
            "GeolocationX": 47.3783808,
            "GeolocationY": 8.5104531
        },
        "CompanyWebsite": "https://www.jarowa.ch"
    },
    "CompanyName": null
},
    {
        "Id": "1a80efa1-3656-4c37-95ce-884944ee3e8c",
        "Name": "BEST IN TOWN",
        "Surname": "Zürich",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 548 13 44",
            "CompanyAddress": {
                "Street": "Bahnhofstrasse",
                "HouseNumber": "37",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8001",
                "GeolocationX": 47.3716248,
                "GeolocationY": 8.5386461
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "1d7b0dcc-d52f-465a-882f-537624a25c0c",
        "Name": "Craftsman 1",
        "Surname": "Zug",
        "ContactDetails": {
            "TelephoneNumber": "+41 44 444 44 44",
            "CompanyAddress": {
                "Street": "Alte Landstrasse",
                "HouseNumber": "A6",
                "Municipality": "Oberägeri",
                "Canton": "ZG",
                "AdministrativeAreaLevel2": "Zug",
                "Country": "CH",
                "ZipCode": "6315",
                "GeolocationX": 47.1377369,
                "GeolocationY": 8.5993136
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "2156458b-fbd1-4794-9e99-61b6453d8192",
        "Name": "Abc Craftsman AG",
        "Surname": "Wallisellen",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 548 00 00",
            "CompanyAddress": {
                "Street": "Alte Winterthurerstrasse",
                "HouseNumber": "",
                "Municipality": "Wallisellen",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Bülach",
                "Country": "CH",
                "ZipCode": "8180",
                "GeolocationX": 47.423095,
                "GeolocationY": 8.6020923
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "357acdbe-51d5-459e-8a06-e6b23511041b",
        "Name": "I am GmbH",
        "Surname": "St. Gallen",
        "ContactDetails": {
            "TelephoneNumber": "+41 893 25 345 00 00",
            "CompanyAddress": {
                "Street": "Klosterstrasse",
                "HouseNumber": "3",
                "Municipality": "Goldach",
                "Canton": "SG",
                "AdministrativeAreaLevel2": "Rorschach",
                "Country": "CH",
                "ZipCode": "9403",
                "GeolocationX": 47.4765212,
                "GeolocationY": 9.4714546
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "4ae6aa9b-0290-4723-881d-4c201dd53cb9",
        "Name": "Craftsman",
        "Surname": "Silvan",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 320 00 00",
            "CompanyAddress": {
                "Street": "Landhausweg",
                "HouseNumber": "10",
                "Municipality": "Zug",
                "Canton": "ZG",
                "AdministrativeAreaLevel2": "Zug",
                "Country": "CH",
                "ZipCode": "6300",
                "GeolocationX": 47.17720569999999,
                "GeolocationY": 8.5214134
            },
            "CompanyWebsite": ""
        }
    },
    {
        "Id": "4bd16fca-2bb4-4a32-b69a-611aa3c01aa2",
        "Name": "Bilfit AG",
        "Surname": "Zürich",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 548 00 00",
            "CompanyAddress": {
                "Street": "Bahnhofstrasse",
                "HouseNumber": "87",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8001",
                "GeolocationX": 47.3763888,
                "GeolocationY": 8.5392054
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "5504ef3f-bf91-4da7-80be-aac7cdfde374",
        "Name": "Christoph Krenn Craftsman",
        "Surname": "Zurich",
        "ContactDetails": {
            "TelephoneNumber": "+41 44 444 44 44",
            "CompanyAddress": {
                "Street": "Fabrikstrasse",
                "HouseNumber": "34",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8005",
                "GeolocationX": 47.38584609999999,
                "GeolocationY": 8.5271625
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "5d971223-5864-4209-97af-22e98825acef",
        "Name": "Craftsman Test",
        "Surname": "Zürich",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 548 13 44",
            "CompanyAddress": {
                "Street": "Bahnhofstrasse",
                "HouseNumber": "",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8001",
                "GeolocationX": 47.3717284,
                "GeolocationY": 8.538556
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "5ef6f089-d613-40dd-87c7-517d9efd9c25",
        "Name": "MARKUS Elektriker 2 (Partner)",
        "Surname": "Other Place",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 700 70 70",
            "CompanyAddress": {
                "Street": "Paradeplatz",
                "HouseNumber": "",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8001",
                "GeolocationX": 47.3697857,
                "GeolocationY": 8.538764
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "68f62147-2712-4a55-8238-079dd6f78ba1",
        "Name": "Artigiano Colori e Vernici",
        "Surname": "Lugano",
        "ContactDetails": {
            "TelephoneNumber": "+41 76 111 00 00",
            "CompanyAddress": {
                "Street": "Viale Cassarate",
                "HouseNumber": "",
                "Municipality": "Lugano",
                "Canton": "TI",
                "AdministrativeAreaLevel2": "Lugano",
                "Country": "CH",
                "ZipCode": "6900",
                "GeolocationX": 46.0082287,
                "GeolocationY": 8.9601854
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "818e484f-de17-4316-a5a3-94b481da8695",
        "Name": "asdf",
        "Surname": "adf",
        "ContactDetails": {
            "TelephoneNumber": "+41 33 333 33 32",
            "CompanyAddress": {
                "Street": "",
                "HouseNumber": "",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8001",
                "GeolocationX": 47.3768866,
                "GeolocationY": 8.541694
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "93486164-ce5e-4c05-a2fe-d291fb9e8c1a",
        "Name": "Vaudoise",
        "Surname": "Test Supplier",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 320 86 19",
            "CompanyAddress": {
                "Street": "Zählerweg",
                "HouseNumber": "5",
                "Municipality": "Zug",
                "Canton": "ZG",
                "AdministrativeAreaLevel2": "Zug",
                "Country": "CH",
                "ZipCode": "6300",
                "GeolocationX": 47.1765591,
                "GeolocationY": 8.5130895
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "9db7c134-62ee-4cb5-830e-48a35c1239de",
        "Name": "Revestis",
        "Surname": "Zürich",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 320 00 00",
            "CompanyAddress": {
                "Street": "Kanonengasse",
                "HouseNumber": "",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8004",
                "GeolocationX": 47.3778924,
                "GeolocationY": 8.5299375
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "9f45b995-5e90-4c2c-bfc4-ad5b760ff34f",
        "Name": "Craftsman",
        "Surname": "Fribourg",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 832 00 00",
            "CompanyAddress": {
                "Street": "",
                "HouseNumber": "",
                "Municipality": "Fribourg",
                "Canton": "FR",
                "AdministrativeAreaLevel2": "Sarine District",
                "Country": "CH",
                "ZipCode": "1700",
                "GeolocationX": 46.8064773,
                "GeolocationY": 7.161971899999999
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "a11306e0-2041-4b0f-a2ca-24d94461893f",
        "Name": "IO Craftsman",
        "Surname": "Carpenter",
        "ContactDetails": {
            "TelephoneNumber": "+45 21 77 00 00",
            "CompanyAddress": {
                "Street": "Birchstrasse",
                "HouseNumber": "1",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8057",
                "GeolocationX": 47.4038966,
                "GeolocationY": 8.5343584
            },
            "CompanyWebsite": "www.iogroup.ai"
        }
    },
    {
        "Id": "a8f4c42b-247a-4e99-9ee1-86cf3e52fe30",
        "Name": "Test Artisan",
        "Surname": "Lausanne",
        "ContactDetails": {
            "TelephoneNumber": "+41 76 111 00 00",
            "CompanyAddress": {
                "Street": "Rue de l'Ale",
                "HouseNumber": "",
                "Municipality": "Lausanne",
                "Canton": "VD",
                "AdministrativeAreaLevel2": "Lausanne",
                "Country": "CH",
                "ZipCode": "1003",
                "GeolocationX": 46.5233423,
                "GeolocationY": 6.6287963
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "bd4ba54b-1bb0-4bf0-90ae-f75f513b0401",
        "Name": "Eugene",
        "Surname": "Eugene",
        "ContactDetails": {
            "TelephoneNumber": "+1 231 231 2312",
            "CompanyAddress": {
                "Street": "Freihofstrasse",
                "HouseNumber": "34",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8048",
                "GeolocationX": 47.3839705,
                "GeolocationY": 8.4995509
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "cf9087c1-cf49-4dfb-9a9d-9b7f86d682e5",
        "Name": "qewqwe",
        "Surname": "AG",
        "ContactDetails": {
            "TelephoneNumber": "+41 44 444 44 44",
            "CompanyAddress": {
                "Street": "Dorfstrasse",
                "HouseNumber": "34",
                "Municipality": "Wettingen",
                "Canton": "AG",
                "AdministrativeAreaLevel2": "Baden",
                "Country": "CH",
                "ZipCode": "5430",
                "GeolocationX": 47.466608,
                "GeolocationY": 8.333339
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "d570dd43-8102-4fa1-8afa-1772d42915b1",
        "Name": "S7000",
        "Surname": "Craftsman",
        "ContactDetails": {
            "TelephoneNumber": "+41 59 123 00 00",
            "CompanyAddress": {
                "Street": "Hardturmstrasse",
                "HouseNumber": "3",
                "Municipality": "Zürich",
                "Canton": "ZH",
                "AdministrativeAreaLevel2": "Zürich",
                "Country": "CH",
                "ZipCode": "8005",
                "GeolocationX": 47.3908923,
                "GeolocationY": 8.5206804
            },
            "CompanyWebsite": null
        },
        "CompanyName": null
    },
    {
        "Id": "e19c0a6c-12ff-43d3-9aba-1c5c3f89fdea",
        "Name": "Craftsman",
        "Surname": "Lugano",
        "ContactDetails": {
            "TelephoneNumber": "+41 21 453 00 00",
            "CompanyAddress": {
                "Street": "",
                "HouseNumber": "",
                "Municipality": "",
                "Canton": "TI",
                "AdministrativeAreaLevel2": "Lugano District",
                "Country": "CH",
                "ZipCode": "6945",
                "GeolocationX": 46.0503329,
                "GeolocationY": 8.9489659
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "edbaba1a-fbbe-421f-8f37-e7d07b2dcbbc",
        "Name": "Perito Italia",
        "Surname": "Roma",
        "ContactDetails": {
            "TelephoneNumber": "+41 76 111 00 00",
            "CompanyAddress": {
                "Street": "7",
                "HouseNumber": "",
                "Municipality": "St. Gallen",
                "Canton": "SG",
                "AdministrativeAreaLevel2": "St. Gallen",
                "Country": "CH",
                "ZipCode": "9000",
                "GeolocationX": 47.4211865,
                "GeolocationY": 9.3586293
            },
            "CompanyWebsite": null
        }
    },
    {
        "Id": "fb31041c-6164-43e0-83c9-18d7bc273fa9",
        "Name": "MIGRATION",
        "Surname": "TEST",
        "ContactDetails": {
            "TelephoneNumber": "+41 79 397 00 00",
            "CompanyAddress": {
                "Street": "",
                "HouseNumber": "",
                "Municipality": "Flums",
                "Canton": "SG",
                "AdministrativeAreaLevel2": "Distretto di Sarganserland",
                "Country": "CH",
                "ZipCode": "8896",
                "GeolocationX": 47.0834548,
                "GeolocationY": 9.3203055
            },
            "CompanyWebsite": null
        }
    }];

googleMapStyles = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#f5f5f5"
            }
        ]
    },
    {
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#f5f5f5"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#bdbdbd"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#eeeeee"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#e5e5e5"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#dadada"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#e5e5e5"
            }
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#eeeeee"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#c9c9c9"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    }
];
