-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 13-08-2025 a las 23:32:03
-- Versión del servidor: 11.8.3-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `monitoreo_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `attendance_attendancesession`
--

CREATE TABLE `attendance_attendancesession` (
  `id` bigint(20) NOT NULL,
  `started_at` datetime(6) NOT NULL,
  `ended_at` datetime(6) DEFAULT NULL,
  `average_score` double DEFAULT NULL,
  `student_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `attendance_attendancesession`
--

INSERT INTO `attendance_attendancesession` (`id`, `started_at`, `ended_at`, `average_score`, `student_id`) VALUES
(8, '2025-08-13 05:27:57.139661', '2025-08-13 05:28:24.978345', 87, 5),
(10, '2025-08-13 05:44:31.922763', '2025-08-13 05:44:58.591800', 16.8, 5),
(11, '2025-08-13 08:39:11.029866', '2025-08-13 08:39:19.037249', 18, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `attendance_attentionsample`
--

CREATE TABLE `attendance_attentionsample` (
  `id` bigint(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `ear` double DEFAULT NULL,
  `mar` double DEFAULT NULL,
  `yaw` double DEFAULT NULL,
  `score` double NOT NULL,
  `session_id` bigint(20) NOT NULL,
  `absent` tinyint(1) NOT NULL,
  `reason` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `attendance_attentionsample`
--

INSERT INTO `attendance_attentionsample` (`id`, `created_at`, `ear`, `mar`, `yaw`, `score`, `session_id`, `absent`, `reason`) VALUES
(1, '2025-08-13 05:28:15.157580', NULL, NULL, NULL, 40, 8, 1, 'no_face');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `attendance_systemconfig`
--

CREATE TABLE `attendance_systemconfig` (
  `id` bigint(20) NOT NULL,
  `pct_activity` int(10) UNSIGNED NOT NULL CHECK (`pct_activity` >= 0),
  `pct_attention` int(10) UNSIGNED NOT NULL CHECK (`pct_attention` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_group`
--

CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `auth_group`
--

INSERT INTO `auth_group` (`id`, `name`) VALUES
(2, 'admin'),
(3, 'estudiante'),
(1, 'profesor');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_group_permissions`
--

CREATE TABLE `auth_group_permissions` (
  `id` bigint(20) NOT NULL,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_permission`
--

CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `auth_permission`
--

INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES
(1, 'Can add log entry', 1, 'add_logentry'),
(2, 'Can change log entry', 1, 'change_logentry'),
(3, 'Can delete log entry', 1, 'delete_logentry'),
(4, 'Can view log entry', 1, 'view_logentry'),
(5, 'Can add permission', 2, 'add_permission'),
(6, 'Can change permission', 2, 'change_permission'),
(7, 'Can delete permission', 2, 'delete_permission'),
(8, 'Can view permission', 2, 'view_permission'),
(9, 'Can add group', 3, 'add_group'),
(10, 'Can change group', 3, 'change_group'),
(11, 'Can delete group', 3, 'delete_group'),
(12, 'Can view group', 3, 'view_group'),
(13, 'Can add content type', 4, 'add_contenttype'),
(14, 'Can change content type', 4, 'change_contenttype'),
(15, 'Can delete content type', 4, 'delete_contenttype'),
(16, 'Can view content type', 4, 'view_contenttype'),
(17, 'Can add session', 5, 'add_session'),
(18, 'Can change session', 5, 'change_session'),
(19, 'Can delete session', 5, 'delete_session'),
(20, 'Can view session', 5, 'view_session'),
(21, 'Can add user', 6, 'add_user'),
(22, 'Can change user', 6, 'change_user'),
(23, 'Can delete user', 6, 'delete_user'),
(24, 'Can view user', 6, 'view_user'),
(25, 'Can add course', 7, 'add_course'),
(26, 'Can change course', 7, 'change_course'),
(27, 'Can delete course', 7, 'delete_course'),
(28, 'Can view course', 7, 'view_course'),
(29, 'Can add module', 8, 'add_module'),
(30, 'Can change module', 8, 'change_module'),
(31, 'Can delete module', 8, 'delete_module'),
(32, 'Can view module', 8, 'view_module'),
(33, 'Can add activity', 9, 'add_activity'),
(34, 'Can change activity', 9, 'change_activity'),
(35, 'Can delete activity', 9, 'delete_activity'),
(36, 'Can view activity', 9, 'view_activity'),
(37, 'Can add submission', 10, 'add_submission'),
(38, 'Can change submission', 10, 'change_submission'),
(39, 'Can delete submission', 10, 'delete_submission'),
(40, 'Can view submission', 10, 'view_submission'),
(41, 'Can add enrollment', 11, 'add_enrollment'),
(42, 'Can change enrollment', 11, 'change_enrollment'),
(43, 'Can delete enrollment', 11, 'delete_enrollment'),
(44, 'Can view enrollment', 11, 'view_enrollment'),
(45, 'Can add attendance session', 12, 'add_attendancesession'),
(46, 'Can change attendance session', 12, 'change_attendancesession'),
(47, 'Can delete attendance session', 12, 'delete_attendancesession'),
(48, 'Can view attendance session', 12, 'view_attendancesession'),
(49, 'Can add attention sample', 13, 'add_attentionsample'),
(50, 'Can change attention sample', 13, 'change_attentionsample'),
(51, 'Can delete attention sample', 13, 'delete_attentionsample'),
(52, 'Can view attention sample', 13, 'view_attentionsample'),
(53, 'Can add system config', 14, 'add_systemconfig'),
(54, 'Can change system config', 14, 'change_systemconfig'),
(55, 'Can delete system config', 14, 'delete_systemconfig'),
(56, 'Can view system config', 14, 'view_systemconfig'),
(57, 'Can add parameters', 15, 'add_parameters'),
(58, 'Can change parameters', 15, 'change_parameters'),
(59, 'Can delete parameters', 15, 'delete_parameters'),
(60, 'Can view parameters', 15, 'view_parameters'),
(61, 'Can add attendance session', 16, 'add_attendancesession'),
(62, 'Can change attendance session', 16, 'change_attendancesession'),
(63, 'Can delete attendance session', 16, 'delete_attendancesession'),
(64, 'Can view attendance session', 16, 'view_attendancesession'),
(65, 'Can add activity attempt', 17, 'add_activityattempt'),
(66, 'Can change activity attempt', 17, 'change_activityattempt'),
(67, 'Can delete activity attempt', 17, 'delete_activityattempt'),
(68, 'Can view activity attempt', 17, 'view_activityattempt'),
(69, 'Can add choice', 18, 'add_choice'),
(70, 'Can change choice', 18, 'change_choice'),
(71, 'Can delete choice', 18, 'delete_choice'),
(72, 'Can view choice', 18, 'view_choice'),
(73, 'Can add question', 19, 'add_question'),
(74, 'Can change question', 19, 'change_question'),
(75, 'Can delete question', 19, 'delete_question'),
(76, 'Can view question', 19, 'view_question'),
(77, 'Can add evaluation', 20, 'add_evaluation'),
(78, 'Can change evaluation', 20, 'change_evaluation'),
(79, 'Can delete evaluation', 20, 'delete_evaluation'),
(80, 'Can view evaluation', 20, 'view_evaluation');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_activity`
--

CREATE TABLE `core_activity` (
  `id` bigint(20) NOT NULL,
  `title` varchar(160) NOT NULL,
  `description` longtext NOT NULL,
  `deadline` datetime(6) NOT NULL,
  `points` int(11) NOT NULL,
  `module_id` bigint(20) NOT NULL,
  `post_type` varchar(12) NOT NULL,
  `requires_monitoring` tinyint(1) NOT NULL,
  `evaluatio_seq` int(10) UNSIGNED DEFAULT NULL CHECK (`evaluatio_seq` >= 0),
  `exam_mode` varchar(10) NOT NULL,
  `is_evaluatio` tinyint(1) NOT NULL,
  `learning_type` varchar(20) NOT NULL,
  `learning_url` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_activity`
--

INSERT INTO `core_activity` (`id`, `title`, `description`, `deadline`, `points`, `module_id`, `post_type`, `requires_monitoring`, `evaluatio_seq`, `exam_mode`, `is_evaluatio`, `learning_type`, `learning_url`) VALUES
(1, 'Deber 1', 'pegar', '2025-08-14 20:34:00.000000', 100, 2, 'tarea', 1, NULL, 'quiz', 0, 'video', ''),
(7, 'Actividad Evaluation 4', '[video] dadadadd', '2025-08-20 07:52:00.000000', 20, 1, 'evaluacion', 1, 4, 'quiz', 1, 'video', ''),
(8, 'Actividad Evaluation 5', '[video] dadadadd', '2025-08-20 07:52:00.000000', 20, 1, 'evaluacion', 1, 5, 'quiz', 1, 'video', ''),
(9, 'Actividad Evaluation 1', '[video] ver el video', '2025-08-22 08:12:00.000000', 10, 6, 'evaluacion', 1, 1, 'quiz', 1, 'video', ''),
(10, 'Actividad Evaluation 1', '[video] sskskkss', '2025-08-24 13:27:00.000000', 20, 4, 'evaluacion', 1, 1, 'quiz', 1, 'video', ''),
(11, 'Actividad Evaluation 1', '[video] ver video', '2025-08-14 16:44:00.000000', 20, 9, 'evaluacion', 1, 1, 'quiz', 1, 'video', '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_activityattempt`
--

CREATE TABLE `core_activityattempt` (
  `id` bigint(20) NOT NULL,
  `started_at` datetime(6) NOT NULL,
  `ended_at` datetime(6) DEFAULT NULL,
  `monitoring_score` double NOT NULL,
  `evaluation_grade` double DEFAULT NULL,
  `final_grade` double DEFAULT NULL,
  `activity_id` bigint(20) NOT NULL,
  `monitoring_id` bigint(20) DEFAULT NULL,
  `student_id` bigint(20) NOT NULL,
  `submission_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_activityattempt`
--

INSERT INTO `core_activityattempt` (`id`, `started_at`, `ended_at`, `monitoring_score`, `evaluation_grade`, `final_grade`, `activity_id`, `monitoring_id`, `student_id`, `submission_id`) VALUES
(7, '2025-08-13 08:38:11.866231', '2025-08-13 08:38:22.191600', 0, NULL, 0, 10, 7, 5, NULL),
(8, '2025-08-13 08:39:31.769877', '2025-08-13 08:39:45.860839', 0, NULL, 0, 9, 8, 5, NULL),
(11, '2025-08-13 09:07:52.552116', '2025-08-13 09:08:10.607986', 95, 50, 63.5, 10, 11, 5, NULL),
(12, '2025-08-13 09:08:40.755331', '2025-08-13 09:08:50.009225', 95, 0, 28.5, 7, 12, 5, NULL),
(14, '2025-08-13 09:29:20.639427', '2025-08-13 09:29:42.526508', 95, 0, 28.5, 8, 14, 5, NULL),
(16, '2025-08-13 09:31:43.695735', '2025-08-13 09:31:50.502261', 90, 0, 27, 10, 16, 5, NULL),
(17, '2025-08-13 09:44:40.597702', '2025-08-13 09:45:13.004296', 90, 50, 62, 10, 18, 5, NULL),
(21, '2025-08-13 10:16:48.211519', NULL, 0, 17, 11.9, 7, 22, 5, 3),
(22, '2025-08-13 12:05:00.871297', '2025-08-13 12:05:18.044813', 95, 0, 28.5, 1, 23, 5, NULL),
(23, '2025-08-13 12:05:35.039950', '2025-08-13 12:06:02.729529', 95, 0, 28.5, 8, 24, 5, NULL),
(24, '2025-08-13 12:06:06.536863', '2025-08-13 12:06:17.829772', 95, 20, 42.5, 8, 25, 5, 4),
(27, '2025-08-13 13:47:25.771377', '2025-08-13 13:47:45.677763', 95, 0, 28.5, 11, 29, 9, NULL),
(28, '2025-08-13 13:48:39.526656', '2025-08-13 13:48:48.483885', 95, 0, 28.5, 7, 31, 9, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_attendancesession`
--

CREATE TABLE `core_attendancesession` (
  `id` bigint(20) NOT NULL,
  `started_at` datetime(6) NOT NULL,
  `ended_at` datetime(6) DEFAULT NULL,
  `average_score` double NOT NULL,
  `student_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_attendancesession`
--

INSERT INTO `core_attendancesession` (`id`, `started_at`, `ended_at`, `average_score`, `student_id`) VALUES
(1, '2025-08-13 04:41:57.971179', '2025-08-13 04:42:09.861803', 0, 5),
(2, '2025-08-13 05:47:03.813899', '2025-08-13 05:47:13.234906', 0, 5),
(3, '2025-08-13 08:03:44.906058', '2025-08-13 08:03:47.585992', 0, 5),
(4, '2025-08-13 08:36:34.135009', '2025-08-13 09:02:36.865382', 0.95, 5),
(5, '2025-08-13 08:37:01.030704', '2025-08-13 08:37:13.122003', 0, 5),
(6, '2025-08-13 08:37:28.452875', '2025-08-13 08:37:41.693702', 0, 5),
(7, '2025-08-13 08:38:11.856920', '2025-08-13 08:38:22.189345', 0, 5),
(8, '2025-08-13 08:39:31.757428', '2025-08-13 08:39:45.858526', 0, 5),
(9, '2025-08-13 09:05:45.866616', '2025-08-13 09:06:13.239289', 0.95, 5),
(10, '2025-08-13 09:06:43.339596', '2025-08-13 09:07:02.168854', 0.95, 5),
(11, '2025-08-13 09:07:52.550603', '2025-08-13 09:08:10.607998', 0.95, 5),
(12, '2025-08-13 09:08:40.753668', '2025-08-13 09:08:50.009237', 0.95, 5),
(13, '2025-08-13 09:21:43.962923', '2025-08-13 09:21:50.765615', 0.95, 5),
(14, '2025-08-13 09:29:20.638313', '2025-08-13 09:29:42.526520', 0.95, 5),
(15, '2025-08-13 09:31:01.151119', '2025-08-13 09:31:19.409566', 0.9, 5),
(16, '2025-08-13 09:31:43.694600', '2025-08-13 09:31:50.502274', 0.9, 5),
(17, '2025-08-13 09:32:43.179559', '2025-08-13 09:32:49.402076', 0.89, 5),
(18, '2025-08-13 09:44:40.596334', '2025-08-13 09:45:13.004303', 0.9, 5),
(19, '2025-08-13 09:55:34.953803', '2025-08-13 09:56:08.301524', 0.9, 5),
(20, '2025-08-13 09:59:53.453972', '2025-08-13 10:00:31.982771', 0.95, 5),
(21, '2025-08-13 10:00:35.848903', '2025-08-13 10:00:38.270143', 0, 5),
(22, '2025-08-13 10:16:48.206489', '2025-08-13 12:02:36.326666', 0, 5),
(23, '2025-08-13 12:05:00.863449', '2025-08-13 12:05:18.044831', 0.95, 5),
(24, '2025-08-13 12:05:35.038585', '2025-08-13 12:06:02.729546', 0.95, 5),
(25, '2025-08-13 12:06:06.534882', '2025-08-13 12:06:17.829783', 0.95, 5),
(26, '2025-08-13 12:06:42.498212', '2025-08-13 12:06:56.135459', 0.86, 5),
(27, '2025-08-13 12:25:10.650767', '2025-08-13 12:25:30.561062', 0.95, 5),
(28, '2025-08-13 12:32:14.141319', '2025-08-13 12:32:40.189354', 0.95, 5),
(29, '2025-08-13 13:47:25.769489', '2025-08-13 13:47:45.677775', 0.95, 9),
(30, '2025-08-13 13:48:06.737367', '2025-08-13 13:48:18.296443', 0.91, 9),
(31, '2025-08-13 13:48:39.524569', '2025-08-13 13:48:48.483900', 0.95, 9);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_choice`
--

CREATE TABLE `core_choice` (
  `id` bigint(20) NOT NULL,
  `text` varchar(300) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `question_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_choice`
--

INSERT INTO `core_choice` (`id`, `text`, `is_correct`, `question_id`) VALUES
(1, '1', 1, 2),
(2, '3', 0, 2),
(3, 'sjksjs', 1, 4),
(4, 'lslss', 0, 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_course`
--

CREATE TABLE `core_course` (
  `id` bigint(20) NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(50) NOT NULL,
  `owner_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_course`
--

INSERT INTO `core_course` (`id`, `name`, `code`, `owner_id`) VALUES
(1, 'ISOW', '8695', 2),
(2, 'EDO', '2122', 2),
(3, 'VECTO', '8965', 2),
(4, 'MATE', '7895', 2),
(5, 'LETA', '8965', 2),
(6, 'ABC', '12365', 10);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_enrollment`
--

CREATE TABLE `core_enrollment` (
  `id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `created_at` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_enrollment`
--

INSERT INTO `core_enrollment` (`id`, `course_id`, `student_id`, `created_at`) VALUES
(3, 3, 5, '2025-08-13 02:23:26.294427'),
(4, 2, 5, '2025-08-13 02:23:26.294427'),
(6, 2, 2, '2025-08-13 03:41:31.977772'),
(8, 1, 2, '2025-08-13 06:34:16.647955'),
(9, 1, 7, '2025-08-13 07:06:45.824196'),
(11, 1, 5, '2025-08-13 09:52:13.833975'),
(12, 2, 7, '2025-08-13 12:07:38.756978'),
(13, 6, 9, '2025-08-13 13:43:49.965367'),
(14, 6, 7, '2025-08-13 13:43:55.265368'),
(15, 3, 9, '2025-08-13 13:47:12.292462'),
(16, 1, 9, '2025-08-13 13:47:14.602875');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_evaluation`
--

CREATE TABLE `core_evaluation` (
  `id` bigint(20) NOT NULL,
  `title` varchar(160) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `activity_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_evaluation`
--

INSERT INTO `core_evaluation` (`id`, `title`, `created_at`, `activity_id`) VALUES
(1, 'Evaluación 3', '2025-08-13 08:28:19.645836', 10),
(2, 'Evaluación 1', '2025-08-13 13:45:46.125079', 11);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_module`
--

CREATE TABLE `core_module` (
  `id` bigint(20) NOT NULL,
  `title` varchar(120) NOT NULL,
  `course_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_module`
--

INSERT INTO `core_module` (`id`, `title`, `course_id`) VALUES
(1, 'Unidad 1', 1),
(2, 'Unidad 1', 2),
(3, 'Unidad 2', 2),
(4, 'Unidad 1', 3),
(5, 'Unidad 1', 4),
(6, 'Parcial 2', 1),
(7, 'Unidad1', 5),
(8, 'Parcial 3', 1),
(9, 'Parcial 1', 6),
(10, 'Parcial 2', 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_parameters`
--

CREATE TABLE `core_parameters` (
  `id` bigint(20) NOT NULL,
  `activity_weight` int(10) UNSIGNED NOT NULL CHECK (`activity_weight` >= 0),
  `attendance_weight` int(10) UNSIGNED NOT NULL CHECK (`attendance_weight` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_parameters`
--

INSERT INTO `core_parameters` (`id`, `activity_weight`, `attendance_weight`) VALUES
(1, 70, 30);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_question`
--

CREATE TABLE `core_question` (
  `id` bigint(20) NOT NULL,
  `type` varchar(10) NOT NULL,
  `text` longtext NOT NULL,
  `points` int(10) UNSIGNED NOT NULL CHECK (`points` >= 0),
  `evaluation_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_question`
--

INSERT INTO `core_question` (`id`, `type`, `text`, `points`, `evaluation_id`) VALUES
(1, 'open', 'hola', 1, 1),
(2, 'multiple', 'hola', 1, 1),
(3, 'open', 'hola', 1, 2),
(4, 'multiple', 'jsjsj', 1, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_submission`
--

CREATE TABLE `core_submission` (
  `id` bigint(20) NOT NULL,
  `file_url` varchar(200) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `grade` double DEFAULT NULL,
  `activity_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_submission`
--

INSERT INTO `core_submission` (`id`, `file_url`, `created_at`, `grade`, `activity_id`, `student_id`) VALUES
(1, '/media/submissions/5/20250813025049_defaz%20bustiullosPrueba_Pr%C3%A1ctica_LETA_IIIU-2025.pdf', '2025-08-13 02:50:49.347583', 20, 1, 5),
(3, 'https://docs.google.com/document/d/1BKm7i61xBvu1wDHwnXqk3rZOILUVOKR6qFDFHh5kDMs/edit?usp=drive_link', '2025-08-13 10:17:01.657355', 17, 7, 5),
(4, 'https://docs.google.com/document/d/1BKm7i61xBvu1wDHwnXqk3rZOILUVOKR6qFDFHh5kDMs/edit?usp=drive_link', '2025-08-13 12:06:08.876419', 20, 8, 5),
(6, '/media/submissions/9/20250813134857_Laboratorio_2_Fuzzing_Vision_Educativa.pdf', '2025-08-13 13:48:57.377419', NULL, 7, 9);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_user`
--

CREATE TABLE `core_user` (
  `id` bigint(20) NOT NULL,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `role` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_user`
--

INSERT INTO `core_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`, `role`) VALUES
(1, 'pbkdf2_sha256$1000000$geh3vMcLGYxu11jOBNpOSo$X0ngnCSKRrErGBKr6BMY/HPivMt73MfIIE0krMTtHGc=', '2025-08-12 08:03:54.896065', 1, 'admin_test', '', '', 'admin@test.com', 1, 1, '2025-08-12 07:57:54.334723', 'admin'),
(2, 'pbkdf2_sha256$1000000$vobl7C5mrjFy1zRrHY3k4B$kwA5nrRPk9E6VD/ksAYo0tlhkzbKNIZxJF6nhHP15I0=', NULL, 0, 'luis', '', '', 'example8@gmail.com', 0, 1, '2025-08-12 08:01:13.029619', 'profesor'),
(3, 'pbkdf2_sha256$1000000$TM3BqOF2VRTkfoS1SKllVM$Ly+VGcXWWldJVYryPUwI9hj7OUZeFbqUKAHJUFdZymI=', NULL, 0, 'jose', '', '', 'admin@espe.ec', 0, 1, '2025-08-12 08:05:16.000000', 'admin'),
(4, 'pbkdf2_sha256$1000000$3d5muD61yO6u8qpkuNEmMq$N2RcY4C7FnLUC9WiD3v2tkWt8SF4jYEm/wX+0d2+YqM=', NULL, 0, 'damian', '', '', '1@gmail.com', 0, 1, '2025-08-12 09:27:07.206484', 'profesor'),
(5, 'pbkdf2_sha256$1000000$Ovjy2WLC63qlfL3iLmf6fQ$cMh746GTa3O3PXiiiWMNwDNLZYEHCDOj4NIsOj4ULdk=', NULL, 0, 'moya', '', '', 'example123@gmail.com', 0, 1, '2025-08-12 16:08:08.647027', 'estudiante'),
(6, 'pbkdf2_sha256$1000000$jCLSHDeuX6jxFKbMQw2R6n$LC98YHFCG8Bd9b9RZvosFcowgHbQDZybZH+s/imKRU4=', NULL, 0, 'steeven', '', '', '9@gmail.com', 0, 1, '2025-08-13 03:40:37.550355', 'estudiante'),
(7, 'pbkdf2_sha256$1000000$tjIedR3BGkIyTDloKbsVlB$qre2E9pMHcA2Smjjlu7zI4tKqkFHSYpeu0AZEl5CAc0=', NULL, 0, 'danny', '', '', '8@gmail.com', 0, 1, '2025-08-13 03:41:03.239314', 'estudiante'),
(8, 'pbkdf2_sha256$1000000$xkdwuiLe7igFXKmKuplqYm$XjylM3y/48psv3Ly+HPOnHEVKxPCFzSQ3n8PDS/xw/8=', NULL, 0, 'ana', '', '', '7@gmail.com', 0, 1, '2025-08-13 04:02:34.099863', 'estudiante'),
(9, 'pbkdf2_sha256$1000000$gmkpWZ4LivpNNLN4sga2Qq$haiyFDrcNrBtiTULIseeycduJxascRVwGvlVJMkQ4Iw=', NULL, 0, 'jose_luisbustillos_onate', 'Jose Luis', 'Bustillos Oñate', 'jose@espe.edu.ec', 0, 1, '2025-08-13 13:07:49.858719', 'estudiante'),
(10, 'pbkdf2_sha256$1000000$vYKoEI7Un3phuPEyqbN3l8$3IZEWOX90iWloc7VKUHNaDzMZqWw8b3l9utPqNU7qro=', NULL, 0, 'fernando_andreslara_moya', 'Fernando Andres', 'Lara Moya', 'fer@espe.ec', 0, 1, '2025-08-13 13:28:09.200527', 'profesor');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_user_groups`
--

CREATE TABLE `core_user_groups` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `group_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `core_user_groups`
--

INSERT INTO `core_user_groups` (`id`, `user_id`, `group_id`) VALUES
(12, 2, 1),
(8, 4, 1),
(7, 5, 3),
(9, 6, 3),
(10, 7, 3),
(11, 8, 3),
(13, 9, 3),
(14, 10, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `core_user_user_permissions`
--

CREATE TABLE `core_user_user_permissions` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_admin_log`
--

CREATE TABLE `django_admin_log` (
  `id` int(11) NOT NULL,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext DEFAULT NULL,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) UNSIGNED NOT NULL CHECK (`action_flag` >= 0),
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `django_admin_log`
--

INSERT INTO `django_admin_log` (`id`, `action_time`, `object_id`, `object_repr`, `action_flag`, `change_message`, `content_type_id`, `user_id`) VALUES
(1, '2025-08-12 08:05:18.059746', '3', 'jose', 1, '[{\"added\": {}}]', 6, 1),
(2, '2025-08-12 08:05:50.096554', '3', 'jose', 2, '[{\"changed\": {\"fields\": [\"Role\"]}}]', 6, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_content_type`
--

CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `django_content_type`
--

INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES
(1, 'admin', 'logentry'),
(12, 'attendance', 'attendancesession'),
(13, 'attendance', 'attentionsample'),
(14, 'attendance', 'systemconfig'),
(3, 'auth', 'group'),
(2, 'auth', 'permission'),
(4, 'contenttypes', 'contenttype'),
(9, 'core', 'activity'),
(17, 'core', 'activityattempt'),
(16, 'core', 'attendancesession'),
(18, 'core', 'choice'),
(7, 'core', 'course'),
(11, 'core', 'enrollment'),
(20, 'core', 'evaluation'),
(8, 'core', 'module'),
(15, 'core', 'parameters'),
(19, 'core', 'question'),
(10, 'core', 'submission'),
(6, 'core', 'user'),
(5, 'sessions', 'session');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_migrations`
--

CREATE TABLE `django_migrations` (
  `id` bigint(20) NOT NULL,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `django_migrations`
--

INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES
(1, 'contenttypes', '0001_initial', '2025-08-12 07:56:39.332441'),
(2, 'contenttypes', '0002_remove_content_type_name', '2025-08-12 07:56:39.391573'),
(3, 'auth', '0001_initial', '2025-08-12 07:56:39.582916'),
(4, 'auth', '0002_alter_permission_name_max_length', '2025-08-12 07:56:39.624367'),
(5, 'auth', '0003_alter_user_email_max_length', '2025-08-12 07:56:39.645618'),
(6, 'auth', '0004_alter_user_username_opts', '2025-08-12 07:56:39.653697'),
(7, 'auth', '0005_alter_user_last_login_null', '2025-08-12 07:56:39.663065'),
(8, 'auth', '0006_require_contenttypes_0002', '2025-08-12 07:56:39.674873'),
(9, 'auth', '0007_alter_validators_add_error_messages', '2025-08-12 07:56:39.689738'),
(10, 'auth', '0008_alter_user_username_max_length', '2025-08-12 07:56:39.700333'),
(11, 'auth', '0009_alter_user_last_name_max_length', '2025-08-12 07:56:39.709084'),
(12, 'auth', '0010_alter_group_name_max_length', '2025-08-12 07:56:39.735650'),
(13, 'auth', '0011_update_proxy_permissions', '2025-08-12 07:56:39.745293'),
(14, 'auth', '0012_alter_user_first_name_max_length', '2025-08-12 07:56:39.754007'),
(15, 'core', '0001_initial', '2025-08-12 07:56:40.217421'),
(16, 'admin', '0001_initial', '2025-08-12 07:56:40.299045'),
(17, 'admin', '0002_logentry_remove_auto_add', '2025-08-12 07:56:40.309571'),
(18, 'admin', '0003_logentry_add_action_flag_choices', '2025-08-12 07:56:40.322790'),
(19, 'attendance', '0001_initial', '2025-08-12 07:56:40.421721'),
(20, 'attendance', '0002_alter_attendancesession_options_and_more', '2025-08-12 07:56:40.438450'),
(21, 'attendance', '0003_systemconfig', '2025-08-12 07:56:40.451134'),
(22, 'sessions', '0001_initial', '2025-08-12 07:56:40.490196'),
(23, 'core', '0002_parameters_attendancesession', '2025-08-12 08:26:51.782760'),
(24, 'core', '0003_alter_enrollment_options_enrollment_created_at', '2025-08-13 02:23:26.331500'),
(25, 'core', '0004_activity_post_type_activity_requires_monitoring_and_more', '2025-08-13 03:16:19.534298'),
(26, 'core', '0005_evaluation_question_choice', '2025-08-13 03:53:28.967839'),
(27, 'attendance', '0004_attentionsample_absent_attentionsample_reason_and_more', '2025-08-13 05:25:03.992075'),
(28, 'core', '0006_activity_evaluatio_seq_activity_exam_mode_and_more', '2025-08-13 07:27:15.616350');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_session`
--

CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `django_session`
--

INSERT INTO `django_session` (`session_key`, `session_data`, `expire_date`) VALUES
('63fufbrk990eholc2rknvkeltwrppccc', '.eJxVjMsOwiAURP-FtSGAPC4u3fsN5PK4UjU0Ke3K-O_SpAvdTc6cmTcLuK01bL0sYcrswiQ7_bKI6VnaXuQHtvvM09zWZYp8V_jRdn6bc3ldD_fvoGKvY62kOCcjHWgdVRJSQR4pgaOUfSEvHFDx0SIOYqJ2AM4SGdKSpLPIPl_TRDfs:1uljz8:jMr5Od0gtfS9QXj2pAZQB_FvDL3grI6rNsRSTkWHtSM', '2025-08-26 08:03:54.900334');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `attendance_attendancesession`
--
ALTER TABLE `attendance_attendancesession`
  ADD PRIMARY KEY (`id`),
  ADD KEY `attendance_attendancesession_student_id_2975a1c0_fk_core_user_id` (`student_id`);

--
-- Indices de la tabla `attendance_attentionsample`
--
ALTER TABLE `attendance_attentionsample`
  ADD PRIMARY KEY (`id`),
  ADD KEY `attendance_attention_session_id_3e5008d4_fk_attendanc` (`session_id`);

--
-- Indices de la tabla `attendance_systemconfig`
--
ALTER TABLE `attendance_systemconfig`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `auth_group`
--
ALTER TABLE `auth_group`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  ADD KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`);

--
-- Indices de la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`);

--
-- Indices de la tabla `core_activity`
--
ALTER TABLE `core_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_activity_module_id_a1dd3933_fk_core_module_id` (`module_id`);

--
-- Indices de la tabla `core_activityattempt`
--
ALTER TABLE `core_activityattempt`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_activityattempt_monitoring_id_ca4aa375_fk_core_atte` (`monitoring_id`),
  ADD KEY `core_activityattempt_student_id_d40c4c9e_fk_core_user_id` (`student_id`),
  ADD KEY `core_activityattempt_submission_id_0ab44268_fk_core_subm` (`submission_id`),
  ADD KEY `core_activi_activit_4aa375_idx` (`activity_id`,`student_id`);

--
-- Indices de la tabla `core_attendancesession`
--
ALTER TABLE `core_attendancesession`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_attend_started_ee7b77_idx` (`started_at`),
  ADD KEY `core_attend_student_cf0ffd_idx` (`student_id`);

--
-- Indices de la tabla `core_choice`
--
ALTER TABLE `core_choice`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_choice_question_id_888f53f3_fk_core_question_id` (`question_id`);

--
-- Indices de la tabla `core_course`
--
ALTER TABLE `core_course`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_course_owner_id_3a2f11b3_fk_core_user_id` (`owner_id`);

--
-- Indices de la tabla `core_enrollment`
--
ALTER TABLE `core_enrollment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `core_enrollment_course_id_student_id_e7eae856_uniq` (`course_id`,`student_id`),
  ADD KEY `core_enrollment_student_id_e42e49b3_fk_core_user_id` (`student_id`);

--
-- Indices de la tabla `core_evaluation`
--
ALTER TABLE `core_evaluation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `activity_id` (`activity_id`);

--
-- Indices de la tabla `core_module`
--
ALTER TABLE `core_module`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_module_course_id_2aa5c263_fk_core_course_id` (`course_id`);

--
-- Indices de la tabla `core_parameters`
--
ALTER TABLE `core_parameters`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `core_question`
--
ALTER TABLE `core_question`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_question_evaluation_id_8656d180_fk_core_evaluation_id` (`evaluation_id`);

--
-- Indices de la tabla `core_submission`
--
ALTER TABLE `core_submission`
  ADD PRIMARY KEY (`id`),
  ADD KEY `core_submission_activity_id_4d307558_fk_core_activity_id` (`activity_id`),
  ADD KEY `core_submission_student_id_8d7ab77e_fk_core_user_id` (`student_id`);

--
-- Indices de la tabla `core_user`
--
ALTER TABLE `core_user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indices de la tabla `core_user_groups`
--
ALTER TABLE `core_user_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `core_user_groups_user_id_group_id_c82fcad1_uniq` (`user_id`,`group_id`),
  ADD KEY `core_user_groups_group_id_fe8c697f_fk_auth_group_id` (`group_id`);

--
-- Indices de la tabla `core_user_user_permissions`
--
ALTER TABLE `core_user_user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `core_user_user_permissions_user_id_permission_id_73ea0daa_uniq` (`user_id`,`permission_id`),
  ADD KEY `core_user_user_permi_permission_id_35ccf601_fk_auth_perm` (`permission_id`);

--
-- Indices de la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  ADD KEY `django_admin_log_user_id_c564eba6_fk_core_user_id` (`user_id`);

--
-- Indices de la tabla `django_content_type`
--
ALTER TABLE `django_content_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`);

--
-- Indices de la tabla `django_migrations`
--
ALTER TABLE `django_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `django_session`
--
ALTER TABLE `django_session`
  ADD PRIMARY KEY (`session_key`),
  ADD KEY `django_session_expire_date_a5c62663` (`expire_date`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `attendance_attendancesession`
--
ALTER TABLE `attendance_attendancesession`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `attendance_attentionsample`
--
ALTER TABLE `attendance_attentionsample`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `attendance_systemconfig`
--
ALTER TABLE `attendance_systemconfig`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auth_group`
--
ALTER TABLE `auth_group`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT de la tabla `core_activity`
--
ALTER TABLE `core_activity`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `core_activityattempt`
--
ALTER TABLE `core_activityattempt`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT de la tabla `core_attendancesession`
--
ALTER TABLE `core_attendancesession`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `core_choice`
--
ALTER TABLE `core_choice`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `core_course`
--
ALTER TABLE `core_course`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `core_enrollment`
--
ALTER TABLE `core_enrollment`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `core_evaluation`
--
ALTER TABLE `core_evaluation`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `core_module`
--
ALTER TABLE `core_module`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `core_parameters`
--
ALTER TABLE `core_parameters`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `core_question`
--
ALTER TABLE `core_question`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `core_submission`
--
ALTER TABLE `core_submission`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `core_user`
--
ALTER TABLE `core_user`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `core_user_groups`
--
ALTER TABLE `core_user_groups`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `core_user_user_permissions`
--
ALTER TABLE `core_user_user_permissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `django_content_type`
--
ALTER TABLE `django_content_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `django_migrations`
--
ALTER TABLE `django_migrations`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `attendance_attendancesession`
--
ALTER TABLE `attendance_attendancesession`
  ADD CONSTRAINT `attendance_attendancesession_student_id_2975a1c0_fk_core_user_id` FOREIGN KEY (`student_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `attendance_attentionsample`
--
ALTER TABLE `attendance_attentionsample`
  ADD CONSTRAINT `attendance_attention_session_id_3e5008d4_fk_attendanc` FOREIGN KEY (`session_id`) REFERENCES `attendance_attendancesession` (`id`);

--
-- Filtros para la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`);

--
-- Filtros para la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`);

--
-- Filtros para la tabla `core_activity`
--
ALTER TABLE `core_activity`
  ADD CONSTRAINT `core_activity_module_id_a1dd3933_fk_core_module_id` FOREIGN KEY (`module_id`) REFERENCES `core_module` (`id`);

--
-- Filtros para la tabla `core_activityattempt`
--
ALTER TABLE `core_activityattempt`
  ADD CONSTRAINT `core_activityattempt_activity_id_ce686044_fk_core_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `core_activity` (`id`),
  ADD CONSTRAINT `core_activityattempt_monitoring_id_ca4aa375_fk_core_atte` FOREIGN KEY (`monitoring_id`) REFERENCES `core_attendancesession` (`id`),
  ADD CONSTRAINT `core_activityattempt_student_id_d40c4c9e_fk_core_user_id` FOREIGN KEY (`student_id`) REFERENCES `core_user` (`id`),
  ADD CONSTRAINT `core_activityattempt_submission_id_0ab44268_fk_core_subm` FOREIGN KEY (`submission_id`) REFERENCES `core_submission` (`id`);

--
-- Filtros para la tabla `core_attendancesession`
--
ALTER TABLE `core_attendancesession`
  ADD CONSTRAINT `core_attendancesession_student_id_eac2e1b2_fk_core_user_id` FOREIGN KEY (`student_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `core_choice`
--
ALTER TABLE `core_choice`
  ADD CONSTRAINT `core_choice_question_id_888f53f3_fk_core_question_id` FOREIGN KEY (`question_id`) REFERENCES `core_question` (`id`);

--
-- Filtros para la tabla `core_course`
--
ALTER TABLE `core_course`
  ADD CONSTRAINT `core_course_owner_id_3a2f11b3_fk_core_user_id` FOREIGN KEY (`owner_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `core_enrollment`
--
ALTER TABLE `core_enrollment`
  ADD CONSTRAINT `core_enrollment_course_id_fe1f9f12_fk_core_course_id` FOREIGN KEY (`course_id`) REFERENCES `core_course` (`id`),
  ADD CONSTRAINT `core_enrollment_student_id_e42e49b3_fk_core_user_id` FOREIGN KEY (`student_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `core_evaluation`
--
ALTER TABLE `core_evaluation`
  ADD CONSTRAINT `core_evaluation_activity_id_8c365714_fk_core_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `core_activity` (`id`);

--
-- Filtros para la tabla `core_module`
--
ALTER TABLE `core_module`
  ADD CONSTRAINT `core_module_course_id_2aa5c263_fk_core_course_id` FOREIGN KEY (`course_id`) REFERENCES `core_course` (`id`);

--
-- Filtros para la tabla `core_question`
--
ALTER TABLE `core_question`
  ADD CONSTRAINT `core_question_evaluation_id_8656d180_fk_core_evaluation_id` FOREIGN KEY (`evaluation_id`) REFERENCES `core_evaluation` (`id`);

--
-- Filtros para la tabla `core_submission`
--
ALTER TABLE `core_submission`
  ADD CONSTRAINT `core_submission_activity_id_4d307558_fk_core_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `core_activity` (`id`),
  ADD CONSTRAINT `core_submission_student_id_8d7ab77e_fk_core_user_id` FOREIGN KEY (`student_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `core_user_groups`
--
ALTER TABLE `core_user_groups`
  ADD CONSTRAINT `core_user_groups_group_id_fe8c697f_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  ADD CONSTRAINT `core_user_groups_user_id_70b4d9b8_fk_core_user_id` FOREIGN KEY (`user_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `core_user_user_permissions`
--
ALTER TABLE `core_user_user_permissions`
  ADD CONSTRAINT `core_user_user_permi_permission_id_35ccf601_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `core_user_user_permissions_user_id_085123d3_fk_core_user_id` FOREIGN KEY (`user_id`) REFERENCES `core_user` (`id`);

--
-- Filtros para la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  ADD CONSTRAINT `django_admin_log_user_id_c564eba6_fk_core_user_id` FOREIGN KEY (`user_id`) REFERENCES `core_user` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
