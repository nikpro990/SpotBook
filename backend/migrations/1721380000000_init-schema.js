exports.up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    phone: { type: 'text', notNull: true, unique: true },
    name: { type: 'text' },
    otp_code_hash: { type: 'text' },
    otp_expires_at: { type: 'timestamptz' },
    otp_attempts: { type: 'integer', notNull: true, default: 0 },
    otp_last_sent_at: { type: 'timestamptz' },
    session_token_hash: { type: 'text' },
    session_expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('locations', {
    id: 'id',
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    price_per_hour_byn: { type: 'numeric(10,2)', notNull: true },
    rows: { type: 'integer', notNull: true },
    cols: { type: 'integer', notNull: true },
  });

  pgm.createTable('seats', {
    id: 'id',
    location_id: {
      type: 'integer',
      notNull: true,
      references: 'locations',
      onDelete: 'CASCADE',
    },
    seat_number: { type: 'text', notNull: true },
    row_index: { type: 'integer', notNull: true },
    col_index: { type: 'integer', notNull: true },
    seat_type: { type: 'text', notNull: true, default: 'standard' },
  });
  pgm.addConstraint('seats', 'seats_location_seat_number_unique', {
    unique: ['location_id', 'seat_number'],
  });
  pgm.createIndex('seats', 'location_id');

  pgm.createTable('bookings', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users' },
    location_id: { type: 'integer', notNull: true, references: 'locations' },
    booking_date: { type: 'date', notNull: true },
    start_hour: { type: 'integer', notNull: true },
    end_hour: { type: 'integer', notNull: true },
    total_price_byn: { type: 'numeric(10,2)', notNull: true },
    status: { type: 'text', notNull: true, default: 'confirmed' }, // confirmed | cancelled
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('bookings', 'user_id');
  pgm.createIndex('bookings', ['booking_date', 'location_id']);

  pgm.createTable('booking_seats', {
    id: 'id',
    booking_id: { type: 'integer', notNull: true, references: 'bookings', onDelete: 'CASCADE' },
    seat_id: { type: 'integer', notNull: true, references: 'seats' },
  });
  pgm.createIndex('booking_seats', 'booking_id');

  pgm.createTable('booking_slots', {
    id: 'id',
    seat_id: { type: 'integer', notNull: true, references: 'seats' },
    slot_date: { type: 'date', notNull: true },
    slot_hour: { type: 'integer', notNull: true },
    booking_id: { type: 'integer', notNull: true, references: 'bookings', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('booking_slots', 'booking_slots_unique_slot', {
    unique: ['seat_id', 'slot_date', 'slot_hour'],
  });

  pgm.createIndex('booking_slots', ['slot_date', 'slot_hour']);

  pgm.createTable('sms_log', {
    id: 'id',
    phone: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    sent_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('sms_log');
  pgm.dropTable('booking_slots');
  pgm.dropTable('booking_seats');
  pgm.dropTable('bookings');
  pgm.dropTable('seats');
  pgm.dropTable('locations');
  pgm.dropTable('users');
};
