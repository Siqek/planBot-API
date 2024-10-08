CREATE DATABASE IF NOT EXISTS `timetable`;
CREATE TABLE IF NOT EXISTS `timetable`.`app_config` (
    `id`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `key`           VARCHAR(255)    NOT NULL UNIQUE,
    `value`         TEXT            NOT NULL,
    `updated_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `timetable`.`timetable` (
    `ID`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `teacher`       VARCHAR(40)     NOT NULL,
    `teacherID`     CHAR(2)         NOT NULL,
    `classes`       VARCHAR(20)     NOT NULL,
    `subject`       VARCHAR(20)     NOT NULL,
    `classroom`     VARCHAR(20)     NOT NULL,
    `day_num`       INT             NOT NULL,
    `lesson_num`    INT             NOT NULL
);


-- INSERT INTO `timetable`.`app_config` (`key`, `value`) VALUES (2,12)
-- ON DUPLICATE KEY UPDATE
--     `value` = VALUES(`value`);