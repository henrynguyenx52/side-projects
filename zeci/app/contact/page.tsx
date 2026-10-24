"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Stack,
  IconButton,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Twitter as TwitterIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";

const contactInfo = [
  {
    icon: <PhoneIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    title: "Điện thoại",
    content: "+84 123 456 789",
    description: "Hotline hỗ trợ 24/7",
  },
  {
    icon: <EmailIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    title: "Email",
    content: "info@zeci.com",
    description: "Phản hồi trong 24h",
  },
  {
    icon: <LocationIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    title: "Địa chỉ",
    content: "123 Đường ABC, Quận 1, TP.HCM",
    description: "Trung tâm học tập chính",
  },
];

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
    alert("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.");
  };

  return (
    <Layout>
      <Box
        sx={{
          py: { xs: 4, md: 6 },
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
              }}
            >
              Liên hệ với chúng tôi
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "#1B314B",
                maxWidth: 600,
                mx: "auto",
              }}
            >
              Chúng tôi luôn sẵn sàng hỗ trợ và tư vấn cho bạn
            </Typography>
          </Box>

          <Grid container spacing={6}>
            {/* Contact Information */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color: "#1B314B",
                    mb: 4,
                  }}
                >
                  Thông tin liên hệ
                </Typography>

                <Stack spacing={3}>
                  {contactInfo.map((info, index) => (
                    <Card key={index} sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        <Box sx={{ mt: 1 }}>{info.icon}</Box>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: "bold",
                              color: "#1B314B",
                              mb: 1,
                            }}
                          >
                            {info.title}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#1976d2",
                              fontWeight: 600,
                              mb: 0.5,
                            }}
                          >
                            {info.content}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#666",
                            }}
                          >
                            {info.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Social Media */}
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    color: "#1B314B",
                    mb: 3,
                  }}
                >
                  Theo dõi chúng tôi
                </Typography>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <IconButton
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1565c0",
                      },
                    }}
                  >
                    <FacebookIcon />
                  </IconButton>
                  <IconButton
                    sx={{
                      backgroundColor: "#e91e63",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#c2185b",
                      },
                    }}
                  >
                    <InstagramIcon />
                  </IconButton>
                  <IconButton
                    sx={{
                      backgroundColor: "#f44336",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#d32f2f",
                      },
                    }}
                  >
                    <YouTubeIcon />
                  </IconButton>
                  <IconButton
                    sx={{
                      backgroundColor: "#03a9f4",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#0288d1",
                      },
                    }}
                  >
                    <TwitterIcon />
                  </IconButton>
                </Box>
              </Box>
            </Grid>

            {/* Contact Form */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ p: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color: "#1B314B",
                    mb: 3,
                  }}
                >
                  Gửi tin nhắn
                </Typography>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Họ và tên"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&:hover fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1976d2",
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&:hover fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1976d2",
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Số điện thoại"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&:hover fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1976d2",
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Chủ đề"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&:hover fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1976d2",
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Nội dung tin nhắn"
                        name="message"
                        multiline
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&:hover fieldset": {
                              borderColor: "#1976d2",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1976d2",
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={<SendIcon />}
                        sx={{
                          backgroundColor: "#1976d2",
                          color: "white",
                          px: 4,
                          py: 2,
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          "&:hover": {
                            backgroundColor: "#1565c0",
                          },
                        }}
                      >
                        Gửi tin nhắn
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Card>
            </Grid>
          </Grid>

          {/* Map Section */}
          <Box sx={{ mt: 8 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "#1B314B",
                textAlign: "center",
                mb: 4,
              }}
            >
              Vị trí trung tâm
            </Typography>

            <Card sx={{ p: 4, textAlign: "center" }}>
              <Box
                sx={{
                  height: 400,
                  backgroundColor: "#e3f2fd",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed #1976d2",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <LocationIcon
                    sx={{ fontSize: 60, color: "#1976d2", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    color="#1976d2"
                    sx={{ fontWeight: 600 }}
                  >
                    Bản đồ sẽ được hiển thị tại đây
                  </Typography>
                  <Typography variant="body2" color="#666" sx={{ mt: 1 }}>
                    123 Đường ABC, Quận 1, TP.HCM
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
};

export default ContactPage;
