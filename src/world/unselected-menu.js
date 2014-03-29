module.exports = function(path) {
	switch (path) {
	case '/':
		return {
			submenu: [
				{ name: 'create', label: '(C)reate', hotkey: 'c' },
			]
		};
	case '/create':
		return {
			submenu: [
				{ name: 'agent', label: '(A)gent', hotkey: 'a' },
				{ name: 'group', label: '(G)roup', hotkey: 'g' },
				{ name: 'formation', label: '(F)ormation', hotkey: 'f' }
			]
		};
	}
	return null;
};