module.exports = function(id) {
	switch (id) {
	case undefined:
		return {
			create: { label: '<strong>C</strong>reate', hotkey: 'c' },
		};
	case 'create':
		return {
			agent: { label: '<strong>A</strong>gent', hotkey: 'a' },
			group: { label: '<strong>G</strong>roup', hotkey: 'g' },
			formation: { label: '<strong>F</strong>ormation', hotkey: 'f' }
		};
	}
	return null;
};