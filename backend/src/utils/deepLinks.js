const generateMapLink = (lat, lon, name, platform = 'both') => {
  const ios = `http://maps.apple.com/?q=${name}&ll=${lat},${lon}`;
  const android = `geo:0,0?q=${lat},${lon}(${name})`;
  return { ios, android };
};

module.exports = { generateMapLink };