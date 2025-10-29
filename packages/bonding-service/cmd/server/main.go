package main

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
	"github.com/knowton/bonding-service/internal/models"
	"github.com/knowton/bonding-service/internal/service"
	pb "github.com/knowton/bonding-service/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize database
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Ethereum client
	ethClient, err := ethclient.Dial(getEnv("ARBITRUM_RPC_URL", "https://arb1.arbitrum.io/rpc"))
	if err != nil {
		log.Fatalf("Failed to connect to Ethereum client: %v", err)
	}

	// Create gRPC server
	grpcServer := grpc.NewServer()

	// Register bonding service
	bondingService := service.NewBondingServiceServer(
		db,
		ethClient,
		getEnv("IPBOND_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000"),
		getEnv("PRIVATE_KEY", ""),
	)
	pb.RegisterBondingServiceServer(grpcServer, bondingService)

	// Register reflection service for grpcurl
	reflection.Register(grpcServer)

	// Start server
	port := getEnv("GRPC_PORT", "50051")
	listener, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	log.Printf("Bonding Service gRPC server listening on port %s", port)
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}

func initDatabase() (*gorm.DB, error) {
	dsn := getEnv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=knowton port=5432 sslmode=disable")
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.Bond{},
		&models.Tranche{},
		&models.Investment{},
		&models.RevenueDistribution{},
		&models.RiskAssessment{},
	); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database initialized successfully")
	return db, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
