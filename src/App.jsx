import React, { useState, useEffect } from 'react';
import bbqIcon from '/src/assets/bbq-icon.png';
import Switch from './Switch.jsx';

const App = () => {
  const [backgroundImage, setBackgroundImage] = useState(bbqIcon);
  const [units, setUnits] = useState("metric");
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [inputLocation, setInputLocation] = useState("");
  const [address, setAddress] = useState(null);
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoPermission, setGeoPermission] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [suggested, setSuggested] = useState(null);
  const [dayIndex, setDayIndex] = useState(0);
  
  const part = "current,minutely,hourly"
  const gmapsApiKey = import.meta.env.VITE_GMAPS_API_KEY;
  const owApiKey = import.meta.env.VITE_OW_API_KEY;

  let dayWeather = null;
  let windspeed, feelsLikeEve, weatherDesc, rainfall, icon;

  useEffect(() => {
    if (weather) {
      dayWeather = weather.daily[dayIndex];
      windspeed = dayWeather.wind_speed;
      feelsLikeEve = dayWeather.feels_like.eve;
      weatherDesc = dayWeather.weather[0].description;
      rainfall = dayWeather.rain ?? 0;
      icon = dayWeather.weather[0].icon;

      setDecision(
        windspeed < 10 && 
        feelsLikeEve > 15 && 
        (!weatherDesc.toLowerCase().includes("rain") || rainfall < 2.5)
        ? "Yes!" 
        : "No..."
      );
      
      let reasons = [];

      if (decision === "Yes!") {
        reasons.push(`It's going to be warm enough at ${feelsLikeEve.toFixed(0)} ${units === "metric" ? "\u00B0C" : "\u00B0F"}, there's low wind and it's not going to rain.`);
        setReason(reasons);

      } else {
        if (windspeed >= 10) {
          reasons.push(`at ${windspeed} mph, it's too windy`);
        }

        if (feelsLikeEve <= 15) {
          reasons.push(`at only ${feelsLikeEve.toFixed(0)} ${units === "metric" ? "\u00B0C" : "\u00B0F"} later, it's not warm enough`);    
        }

        if (weatherDesc.toLowerCase().includes("rain")) {
          if (rainfall > 0.1 && rainfall < 2.5) {
            reasons.push(`it's going to rain a little ${weatherDesc.includes("rain") && `(forecast says ${weatherDesc})`}`);
          } else if (rainfall >= 2.5) {
            reasons.push(`it's going to rain a lot ${weatherDesc.includes("rain") && `(forecast says ${weatherDesc})`}`);
          }
        }
        setReason(capitalizeSentences(reasons.join(", plus ") + "."));
      }

      icon && setBackgroundImage(`https://openweathermap.org/img/wn/${icon}@2x.png`);
      setLoading(false);
    }
  }, [weather, decision]);

  useEffect(() => {
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      document.documentElement.style.setProperty('--background-url', `url(${img.src})`);
      document.documentElement.style.setProperty('--background-opacity', img.src.includes('bbq') ? '0.04' : '0.1');
    };
  }, [backgroundImage]);

  function capitalizeSentences(str) {
    return str.replace(/(^|\. *)(.)/g, function(match) {
      return match.toUpperCase();
    });
  }

  const handleUnits = () => {
    setUnits(units === "metric" ? "imperial" : "metric");
  };

  const handleInputChange = (event) => {
    setInputLocation(event.target.value);
  };

  const handleFindMeGeo = (event) => {
    event.preventDefault();
    setLoading(true);
    setDayIndex(0);
    setSuggested(null);
    setError(null);

    if (navigator.geolocation) { // from browser
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${position.coords.latitude}&lon=${position.coords.longitude}&exclude=${part}&units=${units}&appid=${owApiKey}`)
        .then(response => {
            if (!response.ok) {
              throw new Error("Can't get location data at the moment. Please try again.");
            }
            convertLocToAdr(position.coords.latitude, position.coords.longitude);
            return response.json();
          })
          .then(data => {
            setWeather(data);
            setLoading(false);
            setGeoPermission('granted');
            // localStorage.setItem('geoPermission', 'granted');
          });
      }, () => {
        setError("Can't find you automatically as permission has not been granted");
        setGeoPermission('denied');
        // localStorage.setItem('geoPermission', 'denied');
        setLoading(false);
      });
    } else if (event.target.value === '' || event.target.value == undefined) {
      setError("Please enter a location");
      setLoading(false);
    } else {
      setError("Geolocation is not supported by this browser");
      setLoading(false);
    }
  };

  const handleFindMeAdr = (event) => {
    event.preventDefault();
    setLoading(true);
    setDayIndex(0);
    setSuggested(null);
    setError(null);

    if (inputLocation) { // from user input
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(inputLocation)}&key=${gmapsApiKey}`)
        .then(response => {
          if (!response.ok) {
            throw new Error("Can't get weather data at the moment. Please try again.");
          }
          return response.json();
        })
        .then(data => {
          if (data.results[0]) {
            const geometryLocation = data.results[0].geometry.location;
            setAddress(data.results[0].formatted_address);
            return fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${geometryLocation.lat}&lon=${geometryLocation.lng}&exclude=${part}&units=${units}&appid=${owApiKey}`);
          } else {
            throw new Error("Can't find the location you entered. Please try again.");
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("Can't get weather data at the moment. Please try again.");
          }
          return response.json();
        })
        .then(data => {
          setWeather(data);
          setLoading(false);
        })
        .catch(error => {
          setError(error.message);
          setLoading(false);
        });
    } else {
      setError("Please enter a location");
      setLoading(false);
    }
  };

  const convertLocToAdr = (lat, lon) => {
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${gmapsApiKey}`)
    .then(response => response.json())
    .then(data => {
      if (data.results[0]) {
        const addressComponents = data.results[0].address_components;
        const townCity = addressComponents.find((component) => component.types.includes("postal_town"));
        const country = addressComponents.find((component) => component.types.includes("country"));
    
        if (townCity && country) {
          setAddress(townCity.long_name + ", " + country.long_name);
        }
      }
    });
  };

  const suggestBetterDay = () => {
    setLoading(true);
    // const days = weather.daily.slice(1, 8);
    const days = weather.daily;

    const suggestedDayIndex = days.findIndex(day => {
      const windspeed = day.wind_speed;
      const feelsLikeEve = day.feels_like.eve;
      const weatherDesc = day.weather[0].description;
      const rainfall = day.rain || 0;

      return (
        windspeed < 10 &&
        feelsLikeEve > 15 &&
        !weatherDesc.toLowerCase().includes("moderate rain" || "heavy rain") &&
        rainfall < 2.5
      );
    });

    if (suggestedDayIndex !== -1) {
      setDayIndex(suggestedDayIndex);
      const date = new Date(weather.daily[suggestedDayIndex].dt * 1000);
      const dayOfWeek = date.toLocaleString('default', { weekday: 'long' });
      const formattedDate = date.toLocaleString('default', { month: 'long', day: 'numeric' });
      const weatherDesc = weather.daily[suggestedDayIndex].weather[0].description;

      setSuggested({
        dayOfWeek: dayOfWeek,
        formattedDate: formattedDate,
        weatherDesc: weatherDesc,
      });

      setLoading(false);
      return suggestedDayIndex;

    } else {
      setSuggested(0);
      setLoading(false);
      return 0;
    }
  };

  return (
    <>
    <div id="container">
      {showTooltip && (
        <div id="popover">
          <img src='src/assets/arrow2.svg' alt='arrow' />
          <p>Sure! Click this button, and choose <strong>Reset permission</strong>.</p>
        </div>
      )}
      <h1 className="main-title">Should I have a BBQ today?</h1>
        <div className="decision"> 
          
          {loading && (
            <h2 className="loading">Loading...</h2>
          )}
          
          {!loading && !error && (
            <h2 data-decision>{decision}</h2>
          )}
        </div>

        {!loading && weather && !error && (
          <>
          <div id="explainer">
            <p>
              <a 
                data-explainer 
                className={`explainer-text ${isOpen ? 'show' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                data-toggle="collapse" 
                href="#collapsePanel" 
                role="button" 
                aria-expanded="false" 
                aria-controls="collapsePanel"
              >
                Why {decision === "Yes!" ? "Yes" : "No"}?
              </a>
            </p>
          </div>

          <div className={`table todays-weather collapse ${isOpen ? 'show' : ''}`} id="collapsePanel">
              <p>{reason}</p>
              
              {!suggested && suggested !== 0 && decision === "No..." && (
                <p><a href="#" onClick={suggestBetterDay}>Suggest a better day?</a></p>
              )}

            {suggested !== null && suggested !== undefined && (
              dayIndex !== 0 ? (
                <>
                  <p>---</p>
                  <p>
                    The next best day for a BBQ is 
                    <strong>
                      {dayIndex == 1 
                        ? ` tomorrow (${suggested.dayOfWeek}, ${suggested.formattedDate})`
                        : ` ${suggested.dayOfWeek}, ${suggested.formattedDate}`
                      }
                    </strong>. The forecast says {suggested.weatherDesc}.
                  </p>
                </>
              ) : (
                <p>Unfortunately, there are no good days for a BBQ in the next week.</p>
              )
            )}
            <table>
              <thead></thead>
              <tbody>
                {/* <tr>
                  <td colSpan={3}>
                    {location && (
                      <span className="toggle">
                        <Switch
                          isOn={units === "metric" ? true : false}
                          handleToggle={() => handleUnits()}
                          labelLeft="&deg;F"
                          labelRight="&deg;C"
                        />
                      </span>
                    )}
                  </td>
                </tr> */}
                <tr data-template>
                  <th scope="row">🌬️ Wind speed</th>
                  <td>{weather.daily[dayIndex].wind_speed.toFixed(1)}</td>
                  <td>
                    <span data-wind-today></span>mph
                  </td>
                </tr>
                <tr data-template>
                  <th scope="row">🌡️ Temperature</th>
                  <td>{weather.daily[dayIndex].temp.day.toFixed(1)}</td>
                  <td>
                    <span data-temp-today dangerouslySetInnerHTML={{ __html: units === "metric" ? `&deg;C` : `&deg;F` }} />                  
                  </td>
                </tr>
                <tr data-template>
                  <th scope="row">🌧️ Rainfall</th>
                  <td>{weather.daily[dayIndex].rain ? weather.daily[dayIndex].rain.toFixed(1) : 0}</td>
                  <td>
                    <span data-rain-today></span>mm
                  </td>
                </tr>
                <tr data-template>
                  <th scope="row">🏙️ Feels like {dayIndex === 0 ? `today` : 'during the day'}</th>
                  <td>{weather.daily[dayIndex].feels_like.day.toFixed(1)}</td>
                  <td>
                    <span data-feels-day-today dangerouslySetInnerHTML={{ __html: units === "metric" ? `&deg;C` : `&deg;F` }}></span>
                  </td>
                </tr>
                <tr data-template>
                  <th scope="row">🌆 Feels like {dayIndex === 0 ? `this evening` : 'during the evening'}</th>
                  <td>{weather.daily[dayIndex].feels_like.eve.toFixed(1)}</td>
                  <td>
                    <span data-feels-eve-today dangerouslySetInnerHTML={{ __html: units === "metric" ? `&deg;C` : `&deg;F` }}></span>
                  </td>
                </tr>
              </tbody>
              <tfoot></tfoot>
            </table>
            <span>Showing weather for {address ?? weather.timezone}{dayIndex != 0 ? ` on ${suggested.dayOfWeek}, ${suggested.formattedDate}` : " for today"}</span>
            {weather.alerts && (weather.alerts.length > 0) && (weather.alerts[0].start === weather.dt) && (
              <div className="alert">
                <p>⚠️ Be advised: {weather.alerts[0].event}</p>
                {weather.timezone == "Europe/London" ? (
                  <>
                  <a target="_blank" href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings">More info</a>
                  </>
                ) : (
                  <a target="_blank" href={`https://www.google.com/search?q=${weather.alerts[0].sender_name}`}>More info</a>
                )}
                  <img src="src/assets/new-tab.png" alt="new tab" width={14} height={14} className="newTab" />
              </div>
            )}
          </div>
          </>
        )}

        {!loading && !location && (geoPermission !== 'granted') && (          
          <div className="findme">
            <button className="btn-grad" type="button" onClick={handleFindMeGeo}>Find Me</button>
          </div>
        )}

        <div className="search">
          <form onSubmit={handleFindMeAdr} className='location'>
            <label>{location && geoPermission === 'granted' ? "Check somewhere else?" : "Or enter a location: "}
              <input type="text" id="location" value={inputLocation} onChange={handleInputChange} placeholder="Enter a town or city" />
            </label>
            <button className="btn-grad" type="submit">Search</button>
            {error && <p>{error}</p>}
          </form>
        </div>

        <div className="footer">
          {geoPermission === 'denied' && (
            <a href="#" onClick={setShowTooltip}>I've changed my mind, grant location permissions!</a>
          )}
        </div>
      </div> {/* end container */}
    </>
  );
};

export default App;
