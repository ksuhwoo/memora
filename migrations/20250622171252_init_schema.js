// migrations/xxxxxxxx_init_schema.js

exports.up = function(knex) {
  // knex.raw() 함수를 사용하여, 복사한 SQL 구문을 그대로 실행합니다.
  return knex.raw(`
    -- MySQL dump 10.13  Distrib 9.3.0, for macos13.7 (x86_64)
    --
    -- Host: localhost    Database: DB
    -- ------------------------------------------------------
    -- Server version	9.3.0

    /*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
    /*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
    /*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
    /*!50503 SET NAMES utf8mb4 */;
    /*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
    /*!40103 SET TIME_ZONE='+00:00' */;
    /*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
    /*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
    /*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
    /*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

    --
    -- Table structure for table \`chat_messages\`
    --

    DROP TABLE IF EXISTS \`chat_messages\`;
    /*!40101 SET @saved_cs_client     = @@character_set_client */;
    /*!50503 SET character_set_client = utf8mb4 */;
    CREATE TABLE \`chat_messages\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`user_id\` int NOT NULL,
    \`message\` text NOT NULL,
    \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    \`is_deleted\` tinyint(1) NOT NULL DEFAULT '0',
    \`client_message_id\` varchar(36) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`client_message_id\` (\`client_message_id\`),
    KEY \`user_id\` (\`user_id\`),
    KEY \`client_message_id_2\` (\`client_message_id\`),
    CONSTRAINT \`chat_messages_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
    /*!40101 SET character_set_client = @saved_cs_client */;

    --
    -- Table structure for table \`log_records\`
    --

    DROP TABLE IF EXISTS \`log_records\`;
    /*!40101 SET @saved_cs_client     = @@character_set_client */;
    /*!50503 SET character_set_client = utf8mb4 */;
    CREATE TABLE \`log_records\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`log_type\` varchar(20) NOT NULL,
    \`username\` varchar(100) NOT NULL,
    \`ip_address\` varchar(50) DEFAULT NULL,
    \`log_time\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb3;
    /*!40101 SET character_set_client = @saved_cs_client */;

    --
    -- Table structure for table \`users\`
    --

    DROP TABLE IF EXISTS \`users\`;
    /*!40101 SET @saved_cs_client     = @@character_set_client */;
    /*!50503 SET character_set_client = utf8mb4 */;
    CREATE TABLE \`users\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`name\` varchar(20) NOT NULL,
    \`birth\` date DEFAULT NULL,
    \`password\` varchar(255) NOT NULL,
    \`email\` varchar(255) NOT NULL,
    \`username\` varchar(100) NOT NULL,
    \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    \`role\` varchar(10) NOT NULL DEFAULT 'user',
    \`profile_image_url\` varchar(255) DEFAULT NULL,
    \`bio\` text,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`username\` (\`username\`)
    ) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;
    /*!40101 SET character_set_client = @saved_cs_client */;
    /*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

    /*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
    /*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
    /*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
    /*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
    /*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
    /*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
    /*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

    -- Dump completed on 2025-06-23  2:12:39

  `);
};

exports.down = function(knex) {
  // down 함수는 일단 비워두거나, 각 테이블을 drop하는 구문을 추가할 수 있습니다.
  // 예: return knex.schema.dropTable('users').dropTable('posts');
  // 지금 당장은 중요하지 않습니다.
  return knex.raw('DROP TABLE IF EXISTS users, posts, comments;'); // 예시
};