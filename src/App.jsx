import React, { useState, useEffect } from 'react';

const App = () => {
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
  const units = "metric"
  const gmapsApiKey = import.meta.env.VITE_GMAPS_API_KEY;
  const owApiKey = import.meta.env.VITE_OW_API_KEY;

  let dayWeather = null;
  let windspeed, feelsLikeEve, weatherDesc, rainfall;

  useEffect(() => {
    if (weather) {
      dayWeather = weather.daily[dayIndex];
      windspeed = dayWeather.wind_speed;
      feelsLikeEve = dayWeather.feels_like.eve;
      weatherDesc = dayWeather.weather[0].description;
      rainfall = dayWeather.rain ?? 0;

      setDecision(
        windspeed < 10 && 
        feelsLikeEve > 14 && 
        (!weatherDesc.toLowerCase().includes("rain") || rainfall < 2.5)
        ? "Yes!" 
        : "No..."
      );
      
      let reason = '';

      if (windspeed < 10) {
        reason += "It's not too windy, ";
      } else {
        reason += "It's going to be windy, ";
      }

      if (feelsLikeEve > 14) {
        reason += "it's warm, ";
      } else {
        reason += "it's cold, ";
      }

      if (weatherDesc.toLowerCase().includes("clear")) {
        reason += "sunny, ";
      }

      if (weatherDesc.toLowerCase().includes("rain")) {
        if (rainfall == 0) {
          reason += "and it's not set to rain at all.";
        } else if (rainfall > 0.1 && rainfall < 2.5) {
          reason += "although it's going to rain a little.";
        } else {
          reason += "but it's going to rain.";
        }
      } else {
        reason += "and it's not set to rain.";
      }

      setReason(reason);
      setLoading(false);
    }
  }, [weather]);

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
                const days = weather.daily.slice(1, 8);

                const suggestedDayIndex = days.findIndex(day => {
                  const windspeed = day.wind_speed;
                  const feelsLikeEve = day.feels_like.eve;
                  const weatherDesc = day.weather[0].description;
                  const rainfall = day.rain || 0;

                  return (
                    windspeed < 10 &&
                    feelsLikeEve > 14 &&
                    !weatherDesc.toLowerCase().includes("rain") &&
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
                    weatherSummary: `The next best day for a BBQ is ${dayOfWeek}, ${formattedDate}. The weather will be: ${weatherDesc}.`
                 });

                 setLoading(false);
                 return suggestedDayIndex;

                } else {
                  setSuggested({weatherSummary: "Unfortunately, there are no good days for a BBQ in the next week."});
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
                        {!suggested && decision === "No..." && (
                          <p><a href="#" onClick={suggestBetterDay}>Suggest a better day?</a></p>
                        )}
                        {suggested && (<p>{suggested.weatherSummary}</p>)}
                        <table>
                          <thead></thead>
                          <tbody>
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
                                <span data-temp-today></span>&deg;C
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
                              <th scope="row">🏙️ Feels like today</th>
                              <td>{weather.daily[dayIndex].feels_like.day.toFixed(1)}</td>
                              <td>
                                <span data-feels-day-today></span>&deg;C
                              </td>
                            </tr>
                            <tr data-template>
                              <th scope="row">🌆 Feels like this evening</th>
                              <td>{weather.daily[dayIndex].feels_like.eve.toFixed(1)}</td>
                              <td>
                                <span data-feels-eve-today></span>&deg;C
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
                        <button type="button" onClick={handleFindMeGeo}>Find Me</button>
                      </div>
                    )}

                    <div className="search">
                      <form onSubmit={handleFindMeAdr} className='location'>
                        <label>{location && geoPermission === 'granted' ? "Check somewhere else?" : "Or enter a location: "}
                          <input type="text" id="location" value={inputLocation} onChange={handleInputChange} placeholder="Enter a town or city" />
                        </label>
                        <button type="submit">Search</button>
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
