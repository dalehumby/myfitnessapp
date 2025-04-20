-- backend/schema.sql
--
-- File generated with SQLiteStudio v3.4.10 on Fri Apr 18 14:22:15 2025
--
-- Text encoding used: UTF-8
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- Table: day
CREATE TABLE IF NOT EXISTS day (
    id          INTEGER PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    program_id INTEGER REFERENCES program (id)
                        NOT NULL,
    title       TEXT    NOT NULL
);

INSERT INTO day (
                    id,
                    program_id,
                    title
                )
                VALUES (
                    1,
                    1,
                    'Day A'
                );

INSERT INTO day (
                    id,
                    program_id,
                    title
                )
                VALUES (
                    2,
                    1,
                    'Day B'
                );


-- Table: day_exercise
CREATE TABLE IF NOT EXISTS day_exercise (
    id          INTEGER PRIMARY KEY
                          NOT NULL,
    day_id      INTEGER REFERENCES day (id)
                          NOT NULL,
    exercise_id NUMERIC REFERENCES exercise (id)
                          NOT NULL,
    sequence    INTEGER NOT NULL
);

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            1,
                            1,
                            4,
                            1
                          );

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            2,
                            1,
                            2,
                            2
                          );

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            3,
                            1,
                            3,
                            3
                          );

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            4,
                            2,
                            4,
                            1
                          );

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            5,
                            2,
                            1,
                            2
                          );

INSERT INTO day_exercise (
                            id,
                            day_id,
                            exercise_id,
                            sequence
                          )
                          VALUES (
                            6,
                            2,
                            3,
                            3
                          );


-- Table: exercise
CREATE TABLE IF NOT EXISTS exercise (
    id            INTEGER PRIMARY KEY
                          NOT NULL,
    title         TEXT    NOT NULL,
    warmup_sets  INTEGER,
    working_sets INTEGER
);

INSERT INTO exercise (
                          id,
                          title,
                          warmup_sets,
                          working_sets
                      )
                      VALUES (
                          1,
                          'Military press',
                          3,
                          3
                      );

INSERT INTO exercise (
                          id,
                          title,
                          warmup_sets,
                          working_sets
                      )
                      VALUES (
                          2,
                          'Bench press',
                          3,
                          3
                      );

INSERT INTO exercise (
                          id,
                          title,
                          warmup_sets,
                          working_sets
                      )
                      VALUES (
                          3,
                          'Deadlift',
                          3,
                          3
                      );

INSERT INTO exercise (
                          id,
                          title,
                          warmup_sets,
                          working_sets
                      )
                      VALUES (
                          4,
                          'Squat',
                          3,
                          3
                      );

INSERT INTO exercise (
                          id,
                          title,
                          warmup_sets,
                          working_sets
                      )
                      VALUES (
                          5,
                          'Bicep curl',
                          0,
                          3
                      );


-- Table: program
CREATE TABLE IF NOT EXISTS program (
    id  INTEGER PRIMARY KEY
              NOT NULL
              UNIQUE,
    title TEXT    NOT NULL,
    type  TEXT    NOT NULL
);

INSERT INTO program (
                        id,
                        title,
                        type
                    )
                    VALUES (
                        1,
                        'Rough 5x5',
                        'weight'
                    );


-- Table: session
CREATE TABLE IF NOT EXISTS session (
    id        INTEGER PRIMARY KEY
                      NOT NULL,
    start_time     TEXT    NOT NULL
                      DEFAULT (datetime('now', 'localtime') ),
    day_id TEXT    REFERENCES day (id)
                      NOT NULL
);


-- Table: set
CREATE TABLE IF NOT EXISTS exercise_set (
    id          INTEGER PRIMARY KEY
                        NOT NULL,
    session_id  INTEGER NOT NULL
                        REFERENCES session (id),
    exercise_id INTEGER REFERENCES exercise (id)
                        NOT NULL,
    sequence    INTEGER NOT NULL,
    set_type    TEXT    NOT NULL,
    weight      REAL    NOT NULL,
    reps        INTEGER NOT NULL,
    completed   BOOLEAN DEFAULT FALSE
);


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
