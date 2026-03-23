import { TICKET_PRICE, calculateTicketPrice, formatPrice } from './ticket-price';

describe('TICKET_PRICE', () => {
    it('should be 1000', () => {
        expect(TICKET_PRICE).toBe(1000);
    });
});

describe('calculateTicketPrice', () => {
    it('should calculate price for 1 ticket', () => {
        expect(calculateTicketPrice(1)).toBe(1000);
    });

    it('should calculate price for 5 tickets', () => {
        expect(calculateTicketPrice(5)).toBe(5000);
    });

    it('should calculate price for 100 tickets', () => {
        expect(calculateTicketPrice(100)).toBe(100000);
    });

    it('should return 0 for 0 tickets', () => {
        expect(calculateTicketPrice(0)).toBe(0);
    });

    it('should throw for negative quantity', () => {
        expect(() => calculateTicketPrice(-1)).toThrow();
    });

    it('should throw for non-integer quantity', () => {
        expect(() => calculateTicketPrice(1.5)).toThrow();
    });
});

describe('formatPrice', () => {
    it('should format price with comma separator', () => {
        expect(formatPrice(1000)).toBe('1,000');
    });

    it('should format large price', () => {
        expect(formatPrice(150000)).toBe('150,000');
    });

    it('should format zero', () => {
        expect(formatPrice(0)).toBe('0');
    });
});
