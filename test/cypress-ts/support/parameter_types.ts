import { defineParameterType } from '../../../supportCodeLibrary/index';

const hexes: Record<string, string> = {
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF'
};

defineParameterType({
    name: 'color',
    regexp: /(red|blue|green)/,
    transformer: (color: string) => ({ color, hex: hexes[color] })
});
