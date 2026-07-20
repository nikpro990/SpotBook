import request from 'supertest';
import { createApp } from '../src/app';
import { seedLocation, createAuthedUser, futureDateISO } from './helpers';

const app = createApp();

describe('POST /api/bookings', () => {
  it('creates a booking and computes the correct total price', async () => {
    const location = await seedLocation({ price: 5 });
    const { token } = await createAuthedUser();
    const date = futureDateISO(1);

    const res = await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: location.id, date, start_hour: 10, end_hour: 12, seat_ids: [location.seatIds[0]] });

    expect(res.status).toBe(201);
    expect(res.body.total_price_byn).toBe(10); 
    expect(res.body.seats).toEqual(['A1']);
  });

  it('rejects a request without a valid session token', async () => {
    const location = await seedLocation();
    const date = futureDateISO(1);

    const res = await request(app)
      .post('/api/bookings')
      .send({ location_id: location.id, date, start_hour: 10, end_hour: 12, seat_ids: [location.seatIds[0]] });

    expect(res.status).toBe(401);
  });

  it('rejects seats that do not belong to the given location', async () => {
    const locationA = await seedLocation({ name: 'Зал А' });
    const locationB = await seedLocation({ name: 'Зал Б' });
    const { token } = await createAuthedUser();
    const date = futureDateISO(1);

    const res = await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: locationA.id, date, start_hour: 10, end_hour: 12, seat_ids: [locationB.seatIds[0]] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/не принадлежат/);
  });

  it('rejects bookings for a past date', async () => {
    const location = await seedLocation();
    const { token } = await createAuthedUser();

    const res = await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: location.id, date: '2020-01-01', start_hour: 10, end_hour: 12, seat_ids: [location.seatIds[0]] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/прошедшую дату/);
  });

  it('rejects a duration longer than the maximum allowed', async () => {
    const location = await seedLocation();
    const { token } = await createAuthedUser();
    const date = futureDateISO(1);

    const res = await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: location.id, date, start_hour: 0, end_hour: 23, seat_ids: [location.seatIds[0]] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Максимальная длительность/);
  });

  it('rejects a request with more than the maximum number of seats', async () => {
    const location = await seedLocation({ rows: 5, cols: 5 }); // 25 мест
    const { token } = await createAuthedUser();
    const date = futureDateISO(1);

    const res = await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: location.id, date, start_hour: 10, end_hour: 11, seat_ids: location.seatIds });

    expect(res.status).toBe(400);
  });

  it('allows only one of two concurrent requests for the same seat and time to succeed', async () => {
    const location = await seedLocation({ price: 5 });
    const { token } = await createAuthedUser();
    const date = futureDateISO(2);
    const seatId = location.seatIds[3];

    const payload = { location_id: location.id, date, start_hour: 14, end_hour: 16, seat_ids: [seatId] };

    const [res1, res2] = await Promise.all([
      request(app).post('/api/bookings').set('X-Session-Token', token).send(payload),
      request(app).post('/api/bookings').set('X-Session-Token', token).send(payload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = res1.status === 201 ? res1 : res2;
    const loser = res1.status === 409 ? res1 : res2;
    expect(winner.body.ok).toBe(true);
    expect(loser.body.error).toMatch(/уже забронировано/);


    const { pool } = await import('../src/db');
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM booking_slots WHERE seat_id = $1 AND slot_date = $2 AND slot_hour = 14',
      [seatId, date]
    );
    expect(rows[0].count).toBe(1);
  });

  it('allows booking different seats for the same time slot concurrently (no false contention)', async () => {
    const location = await seedLocation({ price: 5, rows: 2, cols: 2 });
    const { token } = await createAuthedUser();
    const date = futureDateISO(2);

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('X-Session-Token', token)
        .send({ location_id: location.id, date, start_hour: 9, end_hour: 10, seat_ids: [location.seatIds[0]] }),
      request(app)
        .post('/api/bookings')
        .set('X-Session-Token', token)
        .send({ location_id: location.id, date, start_hour: 9, end_hour: 10, seat_ids: [location.seatIds[1]] }),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

describe('GET /api/locations/:id/seats', () => {
  it('marks a booked seat as occupied only within the booked hour range', async () => {
    const location = await seedLocation({ price: 5 });
    const { token } = await createAuthedUser();
    const date = futureDateISO(3);
    const seatId = location.seatIds[0];

    await request(app)
      .post('/api/bookings')
      .set('X-Session-Token', token)
      .send({ location_id: location.id, date, start_hour: 10, end_hour: 12, seat_ids: [seatId] });

    const overlapping = await request(app).get(`/api/locations/${location.id}/seats?date=${date}&start=11&end=13`);
    const seatOverlap = overlapping.body.find((s: { id: number }) => s.id === seatId);
    expect(seatOverlap.status).toBe('occupied');

    const nonOverlapping = await request(app).get(`/api/locations/${location.id}/seats?date=${date}&start=12&end=14`);
    const seatFree = nonOverlapping.body.find((s: { id: number }) => s.id === seatId);
    expect(seatFree.status).toBe('free'); 
  });
});
