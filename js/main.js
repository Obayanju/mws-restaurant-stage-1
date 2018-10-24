let restaurants, neighborhoods, cuisines;
let registerSW;
let initMapPromise, neighborhoodPromise, cuisinePromise;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  if (location.hostname !== "localhost") {
    const header = document.querySelector(".nav-header a");
    // prodSiteHref is defined in dbhelper.js
    header.href = prodSiteHref;
  }

  initMapPromise = new Promise((resolve, reject) => {
    initMap(resolve, reject); // added
  });
  neighborhoodPromise = new Promise((resolve, reject) => {
    fetchNeighborhoods(resolve, reject);
  });
  cuisinePromise = new Promise((resolve, reject) => {
    fetchCuisines(resolve, reject);
  });

  // a promise to alert us when all HTML content have been set
  // We then register the SW so that in the install phase, we cache fully rendered HTML pages
  Promise.all([initMapPromise, neighborhoodPromise, cuisinePromise]).then(
    () => {
      // register service worker when all html content has been loaded
      registerSW();
    }
  );
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = (resolve, reject) => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      reject(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML(resolve);
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (resolve, neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
  resolve("neighbourhood html rendered");
  neighborhoodPromise.then(
    value => console.log(value),
    error => console.log(error)
  );
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = (resolve, reject) => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      reject(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML(resolve);
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (resolve, cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");

  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
  resolve("cuisine HTML rendered");
  cuisinePromise.then(value => console.log(value), error => console.log(error));
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = (resolve, reject) => {
  self.newMap = L.map("map", {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer(
    "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
    {
      mapboxToken:
        "pk.eyJ1IjoiZGFtaWxhcmUiLCJhIjoiY2puNWRpNmJiMDNqZzNrczN1NG9wcmljayJ9.3SMwYNlv91a4TGuIjy8QFw",
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: "mapbox.streets"
    }
  ).addTo(newMap);

  updateRestaurants(resolve, reject);
};
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = (resolve, reject) => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        reject(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML(resolve);
      }
    }
  );
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (resolve, restaurants = self.restaurants) => {
  const ul = document.getElementById("restaurants-list");
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap(resolve);
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
  const li = document.createElement("li");

  const image = document.createElement("img");
  image.className = "restaurant-img";
  // src sets the default image(I think)
  image.src = DBHelper.imageUrlsForRestaurant(restaurant)[1];
  image.srcset = `${DBHelper.imageUrlsForRestaurant(restaurant)[0]} 800w`;
  image.alt = `${restaurant.name} restaurant`;
  li.append(image);

  const name = document.createElement("h1");
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement("p");
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement("a");
  more.innerHTML = "View Details";
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (resolve, restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
  resolve("Restaurant and map marker HTML rendered");
  initMapPromise.then(value => console.log(value), error => console.log(error));
};

/* register service worker */
registerSW = () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(
        registration => {
          // Registration was successful
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope
          );
        },
        err => {
          // registration failed
          console.log("ServiceWorker registration failed: ", err);
        }
      );
    });
  }
};
