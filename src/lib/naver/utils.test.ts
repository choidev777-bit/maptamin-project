import { isBusinessMatch } from './utils';

describe('isBusinessMatch', () => {
    test('should match exact names', () => {
        expect(isBusinessMatch('스타벅스', '스타벅스')).toBe(true);
        expect(isBusinessMatch('McDonalds', 'McDonalds')).toBe(true);
    });

    test('should match case-insensitive', () => {
        expect(isBusinessMatch('Starbucks', 'starbucks')).toBe(true);
        expect(isBusinessMatch('STARBUCKS', 'Starbucks')).toBe(true);
    });

    test('should ignore spaces', () => {
        expect(isBusinessMatch('스타벅스 강남점', '스타벅스강남점')).toBe(true);
        expect(isBusinessMatch('Burger King', 'BurgerKing')).toBe(true);
    });

    test('should match partial names (contains)', () => {
        expect(isBusinessMatch('스타벅스 강남점', '스타벅스')).toBe(true);
        expect(isBusinessMatch('스타벅스', '스타벅스 서울시청점')).toBe(true); // Reverse inclusion
    });

    test('should ignore special characters', () => {
        expect(isBusinessMatch('A & B', 'A&B')).toBe(true);
        expect(isBusinessMatch('Hello, World!', 'HelloWorld')).toBe(true);
    });

    test('should return false for non-matching names', () => {
        expect(isBusinessMatch('스타벅스', '이디야')).toBe(false);
        expect(isBusinessMatch('McDonalds', 'Burger King')).toBe(false);
    });

    test('should return false for empty strings', () => {
        expect(isBusinessMatch('', 'Place')).toBe(false);
        expect(isBusinessMatch('Place', '')).toBe(false);
    });
});
