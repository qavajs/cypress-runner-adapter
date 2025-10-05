import { defineParameterType } from '../../../index';

const hexes = {
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF'
}

defineParameterType({
    name: 'color',
    regexp: /(red|blue|green)/,
    transformer: color => ({ color, hex: hexes[color] })
});
